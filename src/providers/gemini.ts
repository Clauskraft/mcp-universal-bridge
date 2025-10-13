import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from './base.js';
import type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ProviderHealth,
  Session,
  Message,
  ToolCall,
} from '../types/index.js';
import { ProviderError } from '../types/index.js';

/**
 * Google Gemini AI Provider Implementation
 */
export class GeminiProvider extends BaseAIProvider {
  protected providerName = 'gemini' as const;
  private client: GoogleGenerativeAI;

  // Available Gemini models
  private static readonly MODELS = [
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-exp-1206',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ];

  // Pricing per million tokens (input/output)
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Free preview
    'gemini-2.0-flash-thinking-exp-01-21': { input: 0, output: 0 }, // Free preview
    'gemini-exp-1206': { input: 0, output: 0 }, // Free preview
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
  };

  constructor(config: any) {
    super(config);
    this.validateConfig();
    this.client = new GoogleGenerativeAI(this.config.apiKey);
  }

  /**
   * Send a chat message and get complete response
   */
  async chat(request: ChatRequest, session: Session): Promise<ChatResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: session.config.model,
        generationConfig: {
          temperature: session.config.temperature,
          maxOutputTokens: session.config.maxTokens,
        },
        systemInstruction: session.config.systemPrompt,
        tools: request.tools ? [{ functionDeclarations: request.tools as any }] : undefined,
      });

      const chat = model.startChat({
        history: this.formatMessages(session),
      });

      const result = await chat.sendMessage(request.message);
      const response = result.response;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text(),
        timestamp: new Date(),
      };

      const toolCalls = this.handleToolCalls(response);

      // Gemini doesn't provide token counts in response, estimate them
      const inputTokens = this.estimateTokens(request.message);
      const outputTokens = this.estimateTokens(response.text());

      return {
        sessionId: session.id,
        message: assistantMessage,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, session.config.model),
        },
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
      };
    } catch (error: any) {
      throw new ProviderError(
        `Gemini chat error: ${error.message}`,
        'gemini',
        { originalError: error }
      );
    }
  }

  /**
   * Send a chat message and stream the response
   */
  async *chatStream(
    request: ChatRequest,
    session: Session
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const model = this.client.getGenerativeModel({
        model: session.config.model,
        generationConfig: {
          temperature: session.config.temperature,
          maxOutputTokens: session.config.maxTokens,
        },
        systemInstruction: session.config.systemPrompt,
        tools: request.tools ? [{ functionDeclarations: request.tools as any }] : undefined,
      });

      const chat = model.startChat({
        history: this.formatMessages(session),
      });

      const result = await chat.sendMessageStream(request.message);

      let fullText = '';
      const collectedToolCalls: ToolCall[] = [];

      for await (const chunk of result.stream) {
        const delta = chunk.text();
        fullText += delta;

        // Check for tool calls in chunk
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const call of chunk.functionCalls) {
            collectedToolCalls.push({
              id: `${call.name}-${Date.now()}`,
              name: call.name,
              arguments: call.args as Record<string, any>,
            });
          }
        }

        yield {
          sessionId: session.id,
          delta,
          done: false,
        };
      }

      // Send final chunk with usage info
      const inputTokens = this.estimateTokens(request.message);
      const outputTokens = this.estimateTokens(fullText);

      yield {
        sessionId: session.id,
        delta: '',
        usage: {
          inputTokens,
          outputTokens,
        },
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
        done: true,
      };
    } catch (error: any) {
      throw new ProviderError(
        `Gemini stream error: ${error.message}`,
        'gemini',
        { originalError: error }
      );
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const model = this.client.getGenerativeModel({ model: this.config.model });
      await model.generateContent('ping');

      return {
        provider: 'gemini',
        healthy: true,
        latency: Date.now() - startTime,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      return {
        provider: 'gemini',
        healthy: false,
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return GeminiProvider.MODELS;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = GeminiProvider.PRICING[model];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Format messages for Gemini API
   */
  protected formatMessages(session: Session): any[] {
    return session.messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Handle tool calls from response
   */
  protected handleToolCalls(response: any): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (response.functionCalls) {
      for (const call of response.functionCalls) {
        toolCalls.push({
          id: `${call.name}-${Date.now()}`,
          name: call.name,
          arguments: call.args,
        });
      }
    }

    return toolCalls;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Map Gemini finish reason to standard finish reason
   */
  private mapFinishReason(
    finishReason: string | undefined
  ): 'stop' | 'length' | 'tool_calls' | 'error' {
    switch (finishReason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'error';
      default:
        return 'stop';
    }
  }
}
