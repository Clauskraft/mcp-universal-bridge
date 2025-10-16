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
 * Grok AI Provider Implementation (xAI)
 * https://x.ai/api
 */
export class GrokProvider extends BaseAIProvider {
  protected providerName = 'grok' as const;
  private baseURL: string;

  // Available Grok models
  private static readonly MODELS = [
    'grok-beta',              // Grok latest model
    'grok-vision-beta',       // Grok with vision capabilities
  ];

  constructor(config: any) {
    super(config);
    this.baseURL = this.config.baseURL || 'https://api.x.ai/v1';
  }

  /**
   * Send a chat message and get complete response
   */
  async chat(request: ChatRequest, session: Session): Promise<ChatResponse> {
    try {
      const messages = this.formatMessages(session);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: session.config.model,
          messages,
          temperature: session.config.temperature || 0.7,
          max_tokens: session.config.maxTokens || 4096,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Grok API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0];

      const assistantMessage: Message = {
        role: 'assistant',
        content: choice.message.content,
        timestamp: new Date(),
      };

      return {
        sessionId: session.id,
        message: assistantMessage,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          cost: this.calculateCost(
            data.usage?.prompt_tokens || 0,
            data.usage?.completion_tokens || 0,
            session.config.model
          ),
        },
        toolCalls: this.handleToolCalls(choice.message),
        finishReason: choice.finish_reason || 'stop',
      };
    } catch (error: any) {
      throw new ProviderError(
        `Grok chat error: ${error.message}`,
        'grok',
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
      const messages = this.formatMessages(session);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: session.config.model,
          messages,
          temperature: session.config.temperature || 0.7,
          max_tokens: session.config.maxTokens || 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Grok API error: ${response.status} - ${error}`);
      }

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Parse SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const choice = data.choices?.[0];

            if (choice?.delta?.content) {
              yield {
                sessionId: session.id,
                delta: choice.delta.content,
                done: false,
              };
            }

            if (data.usage) {
              totalInputTokens = data.usage.prompt_tokens || 0;
              totalOutputTokens = data.usage.completion_tokens || 0;
            }

            if (choice?.finish_reason) {
              yield {
                sessionId: session.id,
                delta: '',
                usage: {
                  inputTokens: totalInputTokens,
                  outputTokens: totalOutputTokens,
                },
                done: true,
              };
            }
          } catch {
            // Skip invalid JSON
            continue;
          }
        }
      }
    } catch (error: any) {
      throw new ProviderError(
        `Grok stream error: ${error.message}`,
        'grok',
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
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Grok API not responding');
      }

      return {
        provider: 'grok',
        healthy: true,
        latency: Date.now() - startTime,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      return {
        provider: 'grok',
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
    return GrokProvider.MODELS;
  }

  /**
   * Calculate cost for token usage
   * Grok pricing (as of October 2025):
   * - grok-beta: $5 per million input tokens, $15 per million output tokens
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const rates = {
      'grok-beta': { input: 5.0, output: 15.0 },
      'grok-vision-beta': { input: 5.0, output: 15.0 },
    };

    const rate = rates[model as keyof typeof rates] || rates['grok-beta'];
    return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  }

  /**
   * Format messages for Grok API (OpenAI-compatible)
   */
  protected formatMessages(session: Session): any[] {
    const messages = [];

    // Add system prompt if present
    if (session.config.systemPrompt) {
      messages.push({
        role: 'system',
        content: session.config.systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of session.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * Handle tool calls (Grok supports OpenAI-style function calling)
   */
  protected handleToolCalls(message: any): ToolCall[] {
    if (!message.tool_calls) return [];

    return message.tool_calls.map((call: any) => ({
      id: call.id,
      name: call.function.name,
      arguments: JSON.parse(call.function.arguments),
    }));
  }
}
