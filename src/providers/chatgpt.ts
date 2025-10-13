import OpenAI from 'openai';
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
 * OpenAI ChatGPT Provider Implementation
 */
export class ChatGPTProvider extends BaseAIProvider {
  protected providerName = 'chatgpt' as const;
  private client: OpenAI;

  // Available OpenAI models
  private static readonly MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1',
    'o1-mini',
    'o1-preview',
  ];

  // Pricing per million tokens (input/output)
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    o1: { input: 15, output: 60 },
    'o1-mini': { input: 3, output: 12 },
    'o1-preview': { input: 15, output: 60 },
  };

  constructor(config: any) {
    super(config);
    this.validateConfig();
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 60000,
    });
  }

  /**
   * Send a chat message and get complete response
   */
  async chat(request: ChatRequest, session: Session): Promise<ChatResponse> {
    try {
      const messages = this.formatMessages(session);

      const response = await this.client.chat.completions.create({
        model: session.config.model,
        messages,
        temperature: session.config.temperature,
        max_tokens: session.config.maxTokens,
        tools: request.tools as any,
      });

      const choice = response.choices[0];
      const assistantMessage: Message = {
        role: 'assistant',
        content: choice.message.content || '',
        timestamp: new Date(),
      };

      const toolCalls = this.handleToolCalls(choice.message);

      return {
        sessionId: session.id,
        message: assistantMessage,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          cost: this.calculateCost(
            response.usage?.prompt_tokens || 0,
            response.usage?.completion_tokens || 0,
            session.config.model
          ),
        },
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error: any) {
      throw new ProviderError(
        `ChatGPT chat error: ${error.message}`,
        'chatgpt',
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

      const stream = await this.client.chat.completions.create({
        model: session.config.model,
        messages,
        temperature: session.config.temperature,
        max_tokens: session.config.maxTokens,
        tools: request.tools as any,
        stream: true,
        stream_options: { include_usage: true },
      });

      let inputTokens = 0;
      let outputTokens = 0;
      const collectedToolCalls: ToolCall[] = [];
      const toolCallsMap = new Map<number, Partial<ToolCall>>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle text content
        if (delta?.content) {
          yield {
            sessionId: session.id,
            delta: delta.content,
            done: false,
          };
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            if (!toolCallsMap.has(index)) {
              toolCallsMap.set(index, {
                id: toolCall.id,
                name: toolCall.function?.name,
                arguments: {},
              });
            }

            const existing = toolCallsMap.get(index)!;
            if (toolCall.function?.arguments) {
              const currentArgs = existing.arguments as any;
              existing.arguments = {
                ...currentArgs,
                ...(JSON.parse(toolCall.function.arguments) || {}),
              };
            }
          }
        }

        // Handle usage info
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || 0;
          outputTokens = chunk.usage.completion_tokens || 0;
        }
      }

      // Convert tool calls map to array
      for (const toolCall of toolCallsMap.values()) {
        if (toolCall.id && toolCall.name) {
          collectedToolCalls.push({
            id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments || {},
          });
        }
      }

      // Send final chunk with usage info
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
        `ChatGPT stream error: ${error.message}`,
        'chatgpt',
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
      await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10,
      });

      return {
        provider: 'chatgpt',
        healthy: true,
        latency: Date.now() - startTime,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      return {
        provider: 'chatgpt',
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
    return ChatGPTProvider.MODELS;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = ChatGPTProvider.PRICING[model];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Format messages for OpenAI API
   */
  protected formatMessages(session: Session): any[] {
    const messages: any[] = [];

    // Add system message if present
    if (session.config.systemPrompt) {
      messages.push({
        role: 'system',
        content: session.config.systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of session.messages) {
      if (msg.role === 'tool') {
        // OpenAI expects tool responses in a specific format
        messages.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolResults?.[0]?.id,
        });
      } else {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  /**
   * Handle tool calls from response
   */
  protected handleToolCalls(message: any): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        toolCalls.push({
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    return toolCalls;
  }

  /**
   * Map OpenAI finish reason to standard finish reason
   */
  private mapFinishReason(
    finishReason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'error' {
    switch (finishReason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'error';
      default:
        return 'stop';
    }
  }
}
