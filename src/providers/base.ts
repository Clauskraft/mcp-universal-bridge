import type {
  AIProvider,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ProviderConfig,
  ProviderHealth,
  Session,
} from '../types/index.js';

/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
export abstract class BaseAIProvider {
  protected config: ProviderConfig;
  protected abstract providerName: AIProvider;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Send a chat message and get a complete response
   */
  abstract chat(request: ChatRequest, session: Session): Promise<ChatResponse>;

  /**
   * Send a chat message and stream the response
   */
  abstract chatStream(
    request: ChatRequest,
    session: Session
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Check if the provider is healthy and responsive
   */
  abstract healthCheck(): Promise<ProviderHealth>;

  /**
   * Get the provider name
   */
  getProviderName(): AIProvider {
    return this.providerName;
  }

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): string[];

  /**
   * Calculate cost for token usage (optional, provider-specific)
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    // Default implementation - override in provider-specific classes
    return 0;
  }

  /**
   * Validate provider configuration
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key required for ${this.providerName}`);
    }
    if (!this.config.model) {
      throw new Error(`Model required for ${this.providerName}`);
    }
  }

  /**
   * Format messages for provider-specific API
   */
  protected abstract formatMessages(session: Session): any[];

  /**
   * Handle tool calls (if supported)
   */
  protected abstract handleToolCalls(response: any): any[];
}
