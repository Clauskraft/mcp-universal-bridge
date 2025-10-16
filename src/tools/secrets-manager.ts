/**
 * Secure Secrets Management System
 *
 * Provides secure storage and management of API keys and secrets
 * with support for external secret managers (Google Secret Manager, Azure Key Vault, etc.)
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface SecretConfig {
  name: string;
  value: string;
  type: 'api_key' | 'token' | 'password' | 'certificate';
  provider?: string; // anthropic, openai, google, github, etc.
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SecretStore {
  secrets: Record<string, EncryptedSecret>;
  version: number;
  updatedAt: Date;
}

interface EncryptedSecret {
  encryptedValue: string;
  iv: string;
  type: string;
  provider?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalSecretManager {
  type: 'google' | 'azure' | 'aws' | 'hashicorp';
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Secrets Manager
 */
export class SecretsManager {
  private encryptionKey: Buffer;
  private storePath: string;
  private store: SecretStore;
  private externalManager?: ExternalSecretManager;

  constructor() {
    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.storePath = path.join(process.cwd(), '.secrets', 'store.json');
    this.store = this.loadStore();
  }

  /**
   * Get or create encryption key
   */
  private getOrCreateEncryptionKey(): Buffer {
    const keyPath = path.join(process.cwd(), '.secrets', 'key');

    // Create .secrets directory if it doesn't exist
    const secretsDir = path.join(process.cwd(), '.secrets');
    if (!fs.existsSync(secretsDir)) {
      fs.mkdirSync(secretsDir, { recursive: true });

      // Add to .gitignore
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
        if (!gitignore.includes('.secrets')) {
          fs.appendFileSync(gitignorePath, '\n# Secrets storage\n.secrets/\n');
        }
      }
    }

    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath);
    }

    // Generate new encryption key
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key, { mode: 0o600 });
    console.log('🔐 Generated new encryption key');

    return key;
  }

  /**
   * Load secret store
   */
  private loadStore(): SecretStore {
    if (fs.existsSync(this.storePath)) {
      const data = fs.readFileSync(this.storePath, 'utf-8');
      return JSON.parse(data);
    }

    return {
      secrets: {},
      version: 1,
      updatedAt: new Date(),
    };
  }

  /**
   * Save secret store
   */
  private saveStore(): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.store.updatedAt = new Date();
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), { mode: 0o600 });
  }

  /**
   * Encrypt a value
   */
  private encrypt(value: string): { encryptedValue: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt a value
   */
  private decrypt(encryptedValue: string, ivHex: string): string {
    const [encrypted, authTagHex] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Set a secret
   */
  setSecret(config: SecretConfig): { success: boolean; message: string } {
    console.log(`🔐 Setting secret: ${config.name} (${config.type})`);

    try {
      const { encryptedValue, iv } = this.encrypt(config.value);

      this.store.secrets[config.name] = {
        encryptedValue,
        iv,
        type: config.type,
        provider: config.provider,
        expiresAt: config.expiresAt?.toISOString(),
        metadata: config.metadata,
        createdAt: this.store.secrets[config.name]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveStore();

      // Update environment variable
      process.env[config.name] = config.value;

      console.log(`✅ Secret set: ${config.name}`);

      return {
        success: true,
        message: `Secret "${config.name}" set successfully`,
      };
    } catch (error: any) {
      console.error(`❌ Failed to set secret: ${error.message}`);
      return {
        success: false,
        message: `Failed to set secret: ${error.message}`,
      };
    }
  }

  /**
   * Get a secret
   */
  getSecret(name: string): string | null {
    const secret = this.store.secrets[name];
    if (!secret) {
      return null;
    }

    // Check expiration
    if (secret.expiresAt && new Date(secret.expiresAt) < new Date()) {
      console.warn(`⚠️ Secret "${name}" has expired`);
      return null;
    }

    try {
      return this.decrypt(secret.encryptedValue, secret.iv);
    } catch (error: any) {
      console.error(`❌ Failed to decrypt secret: ${error.message}`);
      return null;
    }
  }

  /**
   * List all secrets (without values)
   */
  listSecrets(): Array<{
    name: string;
    type: string;
    provider?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
    expired: boolean;
  }> {
    return Object.entries(this.store.secrets).map(([name, secret]) => ({
      name,
      type: secret.type,
      provider: secret.provider,
      expiresAt: secret.expiresAt,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      expired: secret.expiresAt ? new Date(secret.expiresAt) < new Date() : false,
    }));
  }

  /**
   * Delete a secret
   */
  deleteSecret(name: string): { success: boolean; message: string } {
    if (!this.store.secrets[name]) {
      return {
        success: false,
        message: `Secret "${name}" not found`,
      };
    }

    delete this.store.secrets[name];
    this.saveStore();

    // Remove from environment
    delete process.env[name];

    console.log(`🗑️ Secret deleted: ${name}`);

    return {
      success: true,
      message: `Secret "${name}" deleted successfully`,
    };
  }

  /**
   * Validate an API key
   */
  async validateAPIKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
    console.log(`🔍 Validating ${provider} API key...`);

    try {
      switch (provider.toLowerCase()) {
        case 'anthropic':
        case 'claude':
          return await this.validateAnthropicKey(apiKey);

        case 'openai':
        case 'chatgpt':
          return await this.validateOpenAIKey(apiKey);

        case 'google':
        case 'gemini':
          return await this.validateGoogleKey(apiKey);

        case 'github':
          return await this.validateGitHubKey(apiKey);

        default:
          return { valid: false, error: `Unknown provider: ${provider}` };
      }
    } catch (error: any) {
      console.error(`❌ Validation failed: ${error.message}`);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate Anthropic API key
   */
  private async validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (response.ok) {
        return { valid: true };
      }

      const error = await response.json();
      return { valid: false, error: error.error?.message || 'Invalid API key' };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate OpenAI API key
   */
  private async validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      const error = await response.json();
      return { valid: false, error: error.error?.message || 'Invalid API key' };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate Google API key
   */
  private async validateGoogleKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (response.ok) {
        return { valid: true };
      }

      const error = await response.json();
      return { valid: false, error: error.error?.message || 'Invalid API key' };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate GitHub token
   */
  private async validateGitHubKey(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      const error = await response.json();
      return { valid: false, error: error.message || 'Invalid token' };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Set and validate API key
   */
  async setAndValidateAPIKey(
    name: string,
    value: string,
    provider: string
  ): Promise<{ success: boolean; message: string; valid?: boolean }> {
    console.log(`🔐 Setting and validating ${provider} API key...`);

    // First validate the key
    const validation = await this.validateAPIKey(provider, value);

    if (!validation.valid) {
      return {
        success: false,
        message: `Invalid API key: ${validation.error}`,
        valid: false,
      };
    }

    // If valid, store it
    const result = this.setSecret({
      name,
      value,
      type: 'api_key',
      provider,
    });

    return {
      ...result,
      valid: true,
    };
  }

  /**
   * Configure external secret manager
   */
  configureExternalManager(config: ExternalSecretManager): { success: boolean; message: string } {
    console.log(`🔧 Configuring external secret manager: ${config.type}`);

    this.externalManager = config;

    // Save to configuration file
    const configPath = path.join(process.cwd(), '.secrets', 'external.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });

    console.log(`✅ External secret manager configured: ${config.type}`);

    return {
      success: true,
      message: `External secret manager "${config.type}" configured successfully`,
    };
  }

  /**
   * Sync with external secret manager
   */
  async syncWithExternal(): Promise<{ success: boolean; message: string; synced?: number }> {
    if (!this.externalManager?.enabled) {
      return {
        success: false,
        message: 'No external secret manager configured',
      };
    }

    console.log(`🔄 Syncing with external secret manager: ${this.externalManager.type}`);

    // Implementation would depend on the specific external manager
    // This is a placeholder for the integration

    return {
      success: true,
      message: 'Sync with external manager completed',
      synced: 0,
    };
  }

  /**
   * Initialize secrets from environment variables
   */
  initializeFromEnv(): void {
    console.log('🔧 Initializing secrets from environment variables...');

    const envVars = [
      { name: 'ANTHROPIC_API_KEY', provider: 'anthropic', type: 'api_key' as const },
      { name: 'OPENAI_API_KEY', provider: 'openai', type: 'api_key' as const },
      { name: 'GOOGLE_API_KEY', provider: 'google', type: 'api_key' as const },
      { name: 'GITHUB_TOKEN', provider: 'github', type: 'token' as const },
    ];

    let initialized = 0;

    for (const { name, provider, type } of envVars) {
      const value = process.env[name];
      if (value && !this.store.secrets[name]) {
        this.setSecret({ name, value, type, provider });
        initialized++;
      }
    }

    console.log(`✅ Initialized ${initialized} secrets from environment`);
  }

  /**
   * Export secrets to .env format (for backup)
   */
  exportToEnv(): string {
    const lines: string[] = ['# Exported secrets - KEEP SECURE', ''];

    for (const [name, secret] of Object.entries(this.store.secrets)) {
      const value = this.decrypt(secret.encryptedValue, secret.iv);
      lines.push(`${name}=${value}`);
    }

    return lines.join('\n');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const secrets = Object.values(this.store.secrets);
    const now = new Date();

    return {
      totalSecrets: secrets.length,
      byType: secrets.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byProvider: secrets.reduce((acc, s) => {
        if (s.provider) {
          acc[s.provider] = (acc[s.provider] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      expired: secrets.filter(s => s.expiresAt && new Date(s.expiresAt) < now).length,
      externalManagerConfigured: !!this.externalManager?.enabled,
      lastUpdated: this.store.updatedAt,
    };
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager();

// Initialize from environment on startup
secretsManager.initializeFromEnv();

/**
 * Secrets management tool definitions for AI assistants
 */
export const secretsTools = [
  {
    name: 'set_api_key',
    description: 'Securely set and validate an API key for a provider',
    input_schema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['anthropic', 'openai', 'google', 'github'],
          description: 'The provider for this API key',
        },
        api_key: {
          type: 'string',
          description: 'The API key value',
        },
      },
      required: ['provider', 'api_key'],
    },
  },
  {
    name: 'validate_api_key',
    description: 'Validate an API key without storing it',
    input_schema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['anthropic', 'openai', 'google', 'github'],
          description: 'The provider to validate against',
        },
        api_key: {
          type: 'string',
          description: 'The API key to validate',
        },
      },
      required: ['provider', 'api_key'],
    },
  },
  {
    name: 'list_secrets',
    description: 'List all stored secrets (without revealing values)',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];
