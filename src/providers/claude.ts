import Anthropic from '@anthropic-ai/sdk';
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
 * Claude/Anthropic AI Provider Implementation
 */
export class ClaudeProvider extends BaseAIProvider {
  protected providerName = 'claude' as const;
  private client: Anthropic;

  // Available Claude models
  private static readonly MODELS = [
    'claude-opus-4-5-20250514',
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ];

  // Pricing per million tokens (input/output)
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'claude-opus-4-5-20250514': { input: 15, output: 75 },
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
    'claude-3-5-haiku-20241022': { input: 1, output: 5 },
    'claude-3-opus-20240229': { input: 15, output: 75 },
  };

  constructor(config: any) {
    super(config);
    this.validateConfig();
    this.client = new Anthropic({
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

      const response = await this.client.messages.create({
        model: session.config.model,
        max_tokens: session.config.maxTokens || 4096,
        temperature: session.config.temperature,
        system: session.config.systemPrompt,
        messages,
        tools: request.tools as any,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: this.extractContent(response),
        timestamp: new Date(),
      };

      const toolCalls = this.handleToolCalls(response);

      return {
        sessionId: session.id,
        message: assistantMessage,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          cost: this.calculateCost(
            response.usage.input_tokens,
            response.usage.output_tokens,
            session.config.model
          ),
        },
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: this.mapStopReason(response.stop_reason),
      };
    } catch (error: any) {
      throw new ProviderError(
        `Claude chat error: ${error.message}`,
        'claude',
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

      const stream = await this.client.messages.stream({
        model: session.config.model,
        max_tokens: session.config.maxTokens || 4096,
        temperature: session.config.temperature,
        system: session.config.systemPrompt,
        messages,
        tools: request.tools as any,
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const collectedToolCalls: ToolCall[] = [];

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield {
            sessionId: session.id,
            delta: chunk.delta.text,
            done: false,
          };
        }

        if (chunk.type === 'message_start') {
          totalInputTokens = chunk.message.usage.input_tokens;
        }

        if (chunk.type === 'message_delta') {
          totalOutputTokens = chunk.usage.output_tokens;
        }

        if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
          collectedToolCalls.push({
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            arguments: {},
          });
        }
      }

      // Send final chunk with usage info
      yield {
        sessionId: session.id,
        delta: '',
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
        toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
        done: true,
      };
    } catch (error: any) {
      throw new ProviderError(
        `Claude stream error: ${error.message}`,
        'claude',
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
      // Make a minimal API call to check health
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });

      return {
        provider: 'claude',
        healthy: true,
        latency: Date.now() - startTime,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      return {
        provider: 'claude',
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
    return ClaudeProvider.MODELS;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = ClaudeProvider.PRICING[model];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Format messages for Claude API
   */
  protected formatMessages(session: Session): any[] {
    return session.messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'tool' ? 'user' : msg.role,
        content: msg.content,
      }));
  }

  /**
   * Handle tool calls from response
   */
  protected handleToolCalls(response: any): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return toolCalls;
  }

  /**
   * Extract text content from response
   */
  private extractContent(response: any): string {
    const textBlocks = response.content.filter((block: any) => block.type === 'text');
    return textBlocks.map((block: any) => block.text).join('\n');
  }

  /**
   * Map Claude stop reason to standard finish reason
   */
  private mapStopReason(
    stopReason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'error' {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }
}
