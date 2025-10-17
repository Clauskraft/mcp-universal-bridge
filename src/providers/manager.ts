import { BaseAIProvider } from './base.js';
import { ClaudeProvider } from './claude.js';
import { GeminiProvider } from './gemini.js';
import { ChatGPTProvider } from './chatgpt.js';
import { OllamaProvider } from './ollama.js';
import { GrokProvider } from './grok.js';
import type { AIProvider, ProviderConfig, ProviderHealth } from '../types/index.js';
import { BridgeError } from '../types/index.js';

/**
 * Provider Factory and Manager
 * Handles creation and management of AI provider instances
 */
export class ProviderManager {
  private providers: Map<AIProvider, BaseAIProvider> = new Map();
  private configs: Map<AIProvider, ProviderConfig> = new Map();

  constructor() {
    this.initializeFromEnv();
  }

  /**
   * Initialize providers from environment variables
   */
  private initializeFromEnv(): void {
    // Claude/Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.configs.set('claude', {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
        baseURL: process.env.ANTHROPIC_BASE_URL,
        timeout: parseInt(process.env.API_TIMEOUT || '60000'),
      });
    }

    // Google Gemini
    if (process.env.GOOGLE_API_KEY) {
      this.configs.set('gemini', {
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        timeout: parseInt(process.env.API_TIMEOUT || '60000'),
      });
    }

    // OpenAI ChatGPT
    if (process.env.OPENAI_API_KEY) {
      this.configs.set('chatgpt', {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        baseURL: process.env.OPENAI_BASE_URL,
        timeout: parseInt(process.env.API_TIMEOUT || '60000'),
      });
    }

    // Ollama-Local (PC/Localhost)
    // Always available, doesn't require API key
    this.configs.set('ollama-local', {
      apiKey: '', // Ollama doesn't need API key
      model: process.env.OLLAMA_LOCAL_MODEL || 'llama3.3:latest',
      baseURL: process.env.OLLAMA_LOCAL_URL || 'http://localhost:11434',
      timeout: parseInt(process.env.API_TIMEOUT || '60000'),
    });

    // Ollama-Cloud (External Server/Replicate/Modal)
    // Available if cloud URL is configured
    if (process.env.OLLAMA_CLOUD_URL) {
      this.configs.set('ollama-cloud', {
        apiKey: process.env.OLLAMA_CLOUD_API_KEY || '', // Some cloud providers need API key
        model: process.env.OLLAMA_CLOUD_MODEL || 'llama3.3:latest',
        baseURL: process.env.OLLAMA_CLOUD_URL,
        timeout: parseInt(process.env.API_TIMEOUT || '60000'),
      });
    }

    // xAI Grok
    if (process.env.XAI_API_KEY) {
      this.configs.set('grok', {
        apiKey: process.env.XAI_API_KEY,
        model: process.env.GROK_MODEL || 'grok-beta',
        baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
        timeout: parseInt(process.env.API_TIMEOUT || '60000'),
      });
    }
  }

  /**
   * Get or create provider instance
   */
  getProvider(providerName: AIProvider): BaseAIProvider {
    // Return existing provider if available
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName)!;
    }

    // Get config for provider
    const config = this.configs.get(providerName);
    if (!config) {
      throw new BridgeError(
        `Provider ${providerName} not configured. Add API key to environment variables.`,
        'PROVIDER_NOT_CONFIGURED',
        404
      );
    }

    // Create new provider instance
    const provider = this.createProvider(providerName, config);
    this.providers.set(providerName, provider);
    return provider;
  }

  /**
   * Create provider instance based on type
   */
  private createProvider(providerName: AIProvider, config: ProviderConfig): BaseAIProvider {
    switch (providerName) {
      case 'claude':
        return new ClaudeProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'chatgpt':
        return new ChatGPTProvider(config);
      case 'ollama-local':
      case 'ollama-cloud':
        return new OllamaProvider(config);
      case 'grok':
        return new GrokProvider(config);
      default:
        throw new BridgeError(
          `Unknown provider: ${providerName}`,
          'UNKNOWN_PROVIDER',
          400
        );
    }
  }

  /**
   * Register custom provider configuration
   */
  registerProvider(providerName: AIProvider, config: ProviderConfig): void {
    this.configs.set(providerName, config);
    // Remove existing instance to force recreation with new config
    this.providers.delete(providerName);
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(providerName: AIProvider): boolean {
    return this.configs.has(providerName);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(providerName: AIProvider): string[] {
    try {
      const provider = this.getProvider(providerName);
      return provider.getAvailableModels();
    } catch {
      return [];
    }
  }

  /**
   * Check health of all providers
   */
  async healthCheckAll(): Promise<Map<AIProvider, ProviderHealth>> {
    const results = new Map<AIProvider, ProviderHealth>();

    const checks = Array.from(this.configs.keys()).map(async (providerName) => {
      try {
        const provider = this.getProvider(providerName);
        const health = await provider.healthCheck();
        results.set(providerName, health);
      } catch (error: any) {
        results.set(providerName, {
          provider: providerName,
          healthy: false,
          error: error.message,
          checkedAt: new Date(),
        });
      }
    });

    await Promise.all(checks);
    return results;
  }

  /**
   * Check health of specific provider
   */
  async healthCheck(providerName: AIProvider): Promise<ProviderHealth> {
    try {
      const provider = this.getProvider(providerName);
      return await provider.healthCheck();
    } catch (error: any) {
      return {
        provider: providerName,
        healthy: false,
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): Array<{
    provider: AIProvider;
    available: boolean;
    model: string;
    models: string[];
  }> {
    return Array.from(this.configs.entries()).map(([provider, config]) => ({
      provider,
      available: true,
      model: config.model,
      models: this.getAvailableModels(provider),
    }));
  }
}

// Export singleton instance
export const providerManager = new ProviderManager();
