import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AIProvider } from '../types/index.js';
import { BridgeError } from '../types/index.js';

/**
 * Custom Model Configuration
 */
export interface CustomModel {
  id: string;
  provider: AIProvider;
  modelId: string;
  displayName: string;
  description?: string;
  parameters?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

/**
 * Custom Models Manager
 * Handles user-defined custom models for all providers
 */
export class CustomModelsManager {
  private models: Map<string, CustomModel> = new Map();
  private storageFile: string;

  constructor(storageDir: string = '.') {
    this.storageFile = join(storageDir, '.custom-models.json');
    this.loadModels();
  }

  /**
   * Load custom models from persistent storage
   */
  private loadModels(): void {
    try {
      if (existsSync(this.storageFile)) {
        const data = readFileSync(this.storageFile, 'utf-8');
        const modelsArray = JSON.parse(data);

        this.models.clear();
        for (const model of modelsArray) {
          // Convert date strings back to Date objects
          model.createdAt = new Date(model.createdAt);
          this.models.set(model.id, model);
        }

        console.log(`✅ Loaded ${this.models.size} custom models`);
      }
    } catch (error: any) {
      console.error('Failed to load custom models:', error.message);
      // Don't fail initialization, just start with empty models
    }
  }

  /**
   * Save custom models to persistent storage
   */
  private saveModels(): void {
    try {
      const modelsArray = Array.from(this.models.values());
      writeFileSync(this.storageFile, JSON.stringify(modelsArray, null, 2), 'utf-8');
    } catch (error: any) {
      console.error('Failed to save custom models:', error.message);
      throw new BridgeError(
        'Failed to persist custom models',
        'STORAGE_ERROR',
        500,
        { error: error.message }
      );
    }
  }

  /**
   * Add a new custom model
   */
  addModel(config: Omit<CustomModel, 'id' | 'createdAt'>): CustomModel {
    // Validate provider
    const validProviders: AIProvider[] = ['claude', 'gemini', 'chatgpt', 'ollama', 'grok'];
    if (!validProviders.includes(config.provider)) {
      throw new BridgeError(
        `Invalid provider: ${config.provider}`,
        'INVALID_PROVIDER',
        400
      );
    }

    // Validate modelId
    if (!config.modelId || config.modelId.trim().length === 0) {
      throw new BridgeError(
        'Model ID is required',
        'INVALID_MODEL_ID',
        400
      );
    }

    // Check for duplicate modelId within the same provider
    const existingModel = Array.from(this.models.values()).find(
      (m) => m.provider === config.provider && m.modelId === config.modelId
    );

    if (existingModel) {
      throw new BridgeError(
        `Model ${config.modelId} already exists for provider ${config.provider}`,
        'DUPLICATE_MODEL',
        409,
        { existingId: existingModel.id }
      );
    }

    // Generate unique ID
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const model: CustomModel = {
      id,
      provider: config.provider,
      modelId: config.modelId,
      displayName: config.displayName,
      description: config.description,
      parameters: config.parameters,
      createdAt: new Date(),
    };

    this.models.set(id, model);
    this.saveModels();

    return model;
  }

  /**
   * Get a custom model by ID
   */
  getModel(id: string): CustomModel | undefined {
    return this.models.get(id);
  }

  /**
   * Get all custom models
   */
  getAllModels(): CustomModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get custom models for a specific provider
   */
  getModelsByProvider(provider: AIProvider): CustomModel[] {
    return Array.from(this.models.values()).filter((m) => m.provider === provider);
  }

  /**
   * Update a custom model
   */
  updateModel(
    id: string,
    updates: Partial<Omit<CustomModel, 'id' | 'provider' | 'createdAt'>>
  ): CustomModel {
    const model = this.models.get(id);

    if (!model) {
      throw new BridgeError(
        `Custom model ${id} not found`,
        'MODEL_NOT_FOUND',
        404
      );
    }

    // Update allowed fields
    if (updates.modelId !== undefined) model.modelId = updates.modelId;
    if (updates.displayName !== undefined) model.displayName = updates.displayName;
    if (updates.description !== undefined) model.description = updates.description;
    if (updates.parameters !== undefined) model.parameters = updates.parameters;

    this.saveModels();

    return model;
  }

  /**
   * Delete a custom model
   */
  deleteModel(id: string): boolean {
    const deleted = this.models.delete(id);

    if (deleted) {
      this.saveModels();
    }

    return deleted;
  }

  /**
   * Get statistics about custom models
   */
  getStatistics(): {
    total: number;
    byProvider: Record<AIProvider, number>;
  } {
    const byProvider: Record<string, number> = {
      claude: 0,
      gemini: 0,
      chatgpt: 0,
      ollama: 0,
      grok: 0,
    };

    for (const model of this.models.values()) {
      byProvider[model.provider]++;
    }

    return {
      total: this.models.size,
      byProvider: byProvider as Record<AIProvider, number>,
    };
  }

  /**
   * Get custom model definitions formatted for provider display
   */
  getModelsForDisplay(provider: AIProvider): Array<{
    value: string;
    label: string;
    isCustom: true;
  }> {
    return this.getModelsByProvider(provider).map((model) => ({
      value: model.modelId,
      label: `${model.displayName} (Custom)`,
      isCustom: true as const,
    }));
  }
}

// Export singleton instance
export const customModelsManager = new CustomModelsManager();
