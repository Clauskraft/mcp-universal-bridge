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
 * Ollama AI Provider Implementation
 * Local AI models running via Ollama
 */
export class OllamaProvider extends BaseAIProvider {
  protected providerName = 'ollama' as const;
  private baseURL: string;

  // Available Ollama models (including uncensored variants)
  private static readonly MODELS = [
    // Standard models
    'llama3.3:latest',
    'llama3.2:latest',
    'llama3.1:latest',
    'mistral:latest',
    'mixtral:latest',
    'codellama:latest',
    'phi3:latest',
    'gemma2:latest',
    'qwen2.5:latest',
    'deepseek-r1:latest',
    // Uncensored models (high performance + freedom)
    'nous-hermes2:latest',       // Llama 3.1 base - reasoning focused
    'openorca:latest',           // Mistral 7B - lightweight & fast
    'mythomax:latest',           // Mixtral base - creative & philosophical
    'chronos:latest',            // Llama 3 70B - direct & minimal alignment
    'wizardlm2:latest',          // Llama 3 - technical & efficient
    'dolphin-mistral:latest',    // Cognitive Computations - very free
    'openhermes:latest',         // Mistral 7B - balanced freedom
    'phind-codellama:latest',    // CodeLlama 34B - uncensored coding
  ];

  constructor(config: any) {
    super(config);
    // Ollama doesn't require API key validation
    this.baseURL = this.config.baseURL || 'http://localhost:11434';
  }

  /**
   * Override config validation - Ollama doesn't require API key
   */
  protected validateConfig(): void {
    if (!this.config.model) {
      throw new Error(`Model required for ${this.providerName}`);
    }
  }

  /**
   * Send a chat message and get complete response
   */
  async chat(request: ChatRequest, session: Session): Promise<ChatResponse> {
    try {
      const messages = this.formatMessages(session);

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: session.config.model,
          messages,
          stream: false,
          options: {
            temperature: session.config.temperature || 0.7,
            num_predict: session.config.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date(),
      };

      return {
        sessionId: session.id,
        message: assistantMessage,
        usage: {
          inputTokens: data.prompt_eval_count || 0,
          outputTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          cost: 0, // Ollama is free/local
        },
        toolCalls: undefined, // Ollama doesn't support tool calls natively
        finishReason: data.done ? 'stop' : 'error',
      };
    } catch (error: any) {
      throw new ProviderError(
        `Ollama chat error: ${error.message}`,
        'ollama',
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

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: session.config.model,
          messages,
          stream: true,
          options: {
            temperature: session.config.temperature || 0.7,
            num_predict: session.config.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Parse streaming response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.message?.content) {
              yield {
                sessionId: session.id,
                delta: data.message.content,
                done: false,
              };
            }

            if (data.prompt_eval_count) {
              totalInputTokens = data.prompt_eval_count;
            }

            if (data.eval_count) {
              totalOutputTokens = data.eval_count;
            }

            if (data.done) {
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
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } catch (error: any) {
      throw new ProviderError(
        `Ollama stream error: ${error.message}`,
        'ollama',
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
      // Check if Ollama is running
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Ollama not responding');
      }

      return {
        provider: 'ollama',
        healthy: true,
        latency: Date.now() - startTime,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      return {
        provider: 'ollama',
        healthy: false,
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Get available models (from Ollama server)
   */
  getAvailableModels(): string[] {
    // Return common models - actual installed models should be fetched from /api/tags
    return OllamaProvider.MODELS;
  }

  /**
   * Get installed models from Ollama server
   */
  async getInstalledModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) {
        return OllamaProvider.MODELS;
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || OllamaProvider.MODELS;
    } catch {
      return OllamaProvider.MODELS;
    }
  }

  /**
   * Calculate cost for token usage (always 0 for local Ollama)
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    return 0; // Ollama is free/local
  }

  /**
   * Format messages for Ollama API
   */
  protected formatMessages(session: Session): any[] {
    const messages = session.messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'tool' ? 'user' : msg.role,
        content: msg.content,
      }));

    // Add system prompt as first message if present
    if (session.config.systemPrompt) {
      messages.unshift({
        role: 'system',
        content: session.config.systemPrompt,
      });
    }

    return messages;
  }

  /**
   * Handle tool calls (Ollama doesn't support native tool calls)
   */
  protected handleToolCalls(response: any): ToolCall[] {
    return []; // Ollama doesn't support tool calls
  }
}
