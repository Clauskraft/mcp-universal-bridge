/**
 * Chat Optimizer Agent
 *
 * Reduces token usage and optimizes chat communication through:
 * 1. Prompt template compression
 * 2. File upload and reference system
 * 3. Message deduplication
 * 4. Context window management
 * 5. Smart summarization
 */

import { Message, Session } from '../types/index.js';
import crypto from 'crypto';

interface OptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  savings: number;
  savingsPercent: number;
  strategy: string;
  optimizedContent: string;
}

interface FileReference {
  id: string;
  originalSize: number;
  compressedSize: number;
  filename: string;
  mimeType: string;
  uploadedAt: Date;
  url: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  tokenCount: number;
}

export class ChatOptimizer {
  private fileReferences: Map<string, FileReference> = new Map();
  private promptTemplates: Map<string, PromptTemplate> = new Map();
  private messageCache: Map<string, string> = new Map();

  private readonly MAX_CACHE_SIZE_MB: number;
  private readonly MAX_FILE_SIZE_MB: number = 10;
  private currentCacheSize: number = 0;

  constructor() {
    this.MAX_CACHE_SIZE_MB = parseInt(process.env.OPTIMIZER_MAX_CACHE_MB || '100');
    this.initializeStandardTemplates();

    // Auto-cleanup every hour
    setInterval(() => {
      this.clearCache(3600000); // 1 hour
    }, 3600000);
  }

  /**
   * Initialize standard prompt templates
   */
  private initializeStandardTemplates(): void {
    // Code review template
    this.addTemplate({
      id: 'code-review',
      name: 'Code Review',
      template: 'Review code: {{language}}. Focus: {{aspects}}. Codebase: {{project}}',
      variables: ['language', 'aspects', 'project'],
      tokenCount: 12,
    });

    // Data analysis template
    this.addTemplate({
      id: 'data-analysis',
      name: 'Data Analysis',
      template: 'Analyze {{dataType}} data. Goal: {{goal}}. Format: {{format}}',
      variables: ['dataType', 'goal', 'format'],
      tokenCount: 10,
    });

    // Bug fix template
    this.addTemplate({
      id: 'bug-fix',
      name: 'Bug Fix',
      template: 'Debug {{component}}. Error: {{error}}. Context: {{context}}',
      variables: ['component', 'error', 'context'],
      tokenCount: 9,
    });

    // Documentation template
    this.addTemplate({
      id: 'documentation',
      name: 'Documentation',
      template: 'Doc for {{subject}}. Audience: {{audience}}. Style: {{style}}',
      variables: ['subject', 'audience', 'style'],
      tokenCount: 10,
    });

    // General assistant template
    this.addTemplate({
      id: 'assistant',
      name: 'Assistant',
      template: 'AI assistant. Tools: {{tools}}. Focus: {{focus}}',
      variables: ['tools', 'focus'],
      tokenCount: 8,
    });
  }

  /**
   * Add a new prompt template
   */
  addTemplate(template: PromptTemplate): void {
    this.promptTemplates.set(template.id, template);
  }

  /**
   * Optimize a system prompt by using template
   */
  optimizeSystemPrompt(prompt: string): OptimizationResult {
    const originalTokens = this.estimateTokens(prompt);

    // Detect best matching template
    const template = this.detectTemplate(prompt);

    if (template) {
      const optimized = this.applyTemplate(template, prompt);
      const optimizedTokens = this.estimateTokens(optimized);

      return {
        originalTokens,
        optimizedTokens,
        savings: originalTokens - optimizedTokens,
        savingsPercent: ((originalTokens - optimizedTokens) / originalTokens) * 100,
        strategy: `template:${template.id}`,
        optimizedContent: optimized,
      };
    }

    // No template found, return original
    return {
      originalTokens,
      optimizedTokens: originalTokens,
      savings: 0,
      savingsPercent: 0,
      strategy: 'none',
      optimizedContent: prompt,
    };
  }

  /**
   * Upload file and get reference instead of sending full content
   */
  async optimizeFileAttachment(content: string, filename: string, mimeType: string): Promise<OptimizationResult> {
    const originalTokens = this.estimateTokens(content);
    const fileSizeMB = content.length / (1024 * 1024);

    // Check file size limit
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max ${this.MAX_FILE_SIZE_MB}MB)`);
    }

    // Check cache size limit
    const newCacheSizeMB = (this.currentCacheSize + content.length) / (1024 * 1024);
    if (newCacheSizeMB > this.MAX_CACHE_SIZE_MB) {
      // Auto-cleanup oldest entries to make room
      this.evictOldestEntries(content.length);
    }

    // Create file reference
    const fileId = this.generateFileId(content);
    const fileRef: FileReference = {
      id: fileId,
      originalSize: content.length,
      compressedSize: 0,
      filename,
      mimeType,
      uploadedAt: new Date(),
      url: `/api/files/${fileId}`,
    };

    // Store file reference
    this.fileReferences.set(fileId, fileRef);
    this.messageCache.set(fileId, content);
    this.currentCacheSize += content.length;

    // Create optimized reference
    const reference = `[File: ${filename} (${this.formatBytes(content.length)}) - ID: ${fileId}]`;
    const optimizedTokens = this.estimateTokens(reference);

    return {
      originalTokens,
      optimizedTokens,
      savings: originalTokens - optimizedTokens,
      savingsPercent: ((originalTokens - optimizedTokens) / originalTokens) * 100,
      strategy: 'file-reference',
      optimizedContent: reference,
    };
  }

  /**
   * Optimize entire message by detecting and optimizing content
   */
  async optimizeMessage(message: string): Promise<OptimizationResult> {
    const originalTokens = this.estimateTokens(message);
    let optimized = message;
    let totalSavings = 0;
    const strategies: string[] = [];

    // 1. Detect and optimize code blocks
    const codeBlockResult = this.optimizeCodeBlocks(optimized);
    if (codeBlockResult.savings > 0) {
      optimized = codeBlockResult.optimizedContent;
      totalSavings += codeBlockResult.savings;
      strategies.push('code-blocks');
    }

    // 2. Detect and optimize long data (JSON, CSV, etc.)
    const dataResult = await this.optimizeLongData(optimized);
    if (dataResult.savings > 0) {
      optimized = dataResult.optimizedContent;
      totalSavings += dataResult.savings;
      strategies.push('data-upload');
    }

    // 3. Remove redundant whitespace
    optimized = this.removeRedundantWhitespace(optimized);

    // 4. Compress repeated patterns
    optimized = this.compressRepeatedPatterns(optimized);

    const optimizedTokens = this.estimateTokens(optimized);

    return {
      originalTokens,
      optimizedTokens,
      savings: originalTokens - optimizedTokens,
      savingsPercent: ((originalTokens - optimizedTokens) / originalTokens) * 100,
      strategy: strategies.join('+') || 'basic-compression',
      optimizedContent: optimized,
    };
  }

  /**
   * Optimize session context by summarizing old messages
   */
  optimizeSessionContext(session: Session, maxMessages: number = 10): OptimizationResult {
    const messages = session.messages;

    if (messages.length <= maxMessages) {
      const totalTokens = messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);
      return {
        originalTokens: totalTokens,
        optimizedTokens: totalTokens,
        savings: 0,
        savingsPercent: 0,
        strategy: 'no-optimization-needed',
        optimizedContent: JSON.stringify(messages),
      };
    }

    // Keep system message + recent messages + summarize old ones
    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-maxMessages);
    const oldMessages = messages.slice(0, -maxMessages).filter(m => m.role !== 'system');

    // Summarize old messages
    const summary = this.summarizeMessages(oldMessages);
    const summaryMessage: Message = {
      role: 'system',
      content: `[Previous conversation summary (${oldMessages.length} messages)]: ${summary}`,
      timestamp: new Date(),
    };

    const optimizedMessages = [
      ...systemMessages,
      summaryMessage,
      ...recentMessages,
    ];

    const originalTokens = messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);
    const optimizedTokens = optimizedMessages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);

    return {
      originalTokens,
      optimizedTokens,
      savings: originalTokens - optimizedTokens,
      savingsPercent: ((originalTokens - optimizedTokens) / originalTokens) * 100,
      strategy: `context-summarization:${oldMessages.length}→1`,
      optimizedContent: JSON.stringify(optimizedMessages),
    };
  }

  /**
   * Optimize code blocks by uploading large ones
   */
  private optimizeCodeBlocks(content: string): OptimizationResult {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let optimized = content;
    let totalSavings = 0;
    const originalTokens = this.estimateTokens(content);

    const matches = Array.from(content.matchAll(codeBlockPattern));

    for (const match of matches) {
      const fullBlock = match[0];
      const language = match[1] || 'text';
      const code = match[2];

      // If code block is >500 tokens, upload it
      const blockTokens = this.estimateTokens(code);
      if (blockTokens > 500) {
        const fileId = this.generateFileId(code);
        this.messageCache.set(fileId, code);

        const reference = `[Code: ${language} (${blockTokens} tokens) - ID: ${fileId}]`;
        optimized = optimized.replace(fullBlock, reference);
        totalSavings += blockTokens - this.estimateTokens(reference);
      }
    }

    return {
      originalTokens,
      optimizedTokens: this.estimateTokens(optimized),
      savings: totalSavings,
      savingsPercent: (totalSavings / originalTokens) * 100,
      strategy: 'code-block-upload',
      optimizedContent: optimized,
    };
  }

  /**
   * Optimize long data (JSON, CSV) by uploading
   */
  private async optimizeLongData(content: string): Promise<OptimizationResult> {
    const originalTokens = this.estimateTokens(content);
    let optimized = content;
    let totalSavings = 0;

    // Detect JSON blocks
    const jsonPattern = /\{[\s\S]{500,}\}/g;
    const jsonMatches = Array.from(content.matchAll(jsonPattern));

    for (const match of jsonMatches) {
      const jsonBlock = match[0];
      const blockTokens = this.estimateTokens(jsonBlock);

      if (blockTokens > 300) {
        const fileId = this.generateFileId(jsonBlock);
        this.messageCache.set(fileId, jsonBlock);

        const reference = `[JSON Data (${blockTokens} tokens) - ID: ${fileId}]`;
        optimized = optimized.replace(jsonBlock, reference);
        totalSavings += blockTokens - this.estimateTokens(reference);
      }
    }

    return {
      originalTokens,
      optimizedTokens: this.estimateTokens(optimized),
      savings: totalSavings,
      savingsPercent: (totalSavings / originalTokens) * 100,
      strategy: 'data-upload',
      optimizedContent: optimized,
    };
  }

  /**
   * Remove redundant whitespace
   */
  private removeRedundantWhitespace(content: string): string {
    return content
      .replace(/\n\n\n+/g, '\n\n')  // Max 2 consecutive newlines
      .replace(/  +/g, ' ')          // Multiple spaces to single space
      .trim();
  }

  /**
   * Compress repeated patterns
   */
  private compressRepeatedPatterns(content: string): string {
    // Detect repeated phrases (simple implementation)
    const lines = content.split('\n');
    const seen = new Set<string>();
    const compressed: string[] = [];

    for (const line of lines) {
      const normalized = line.trim().toLowerCase();

      // Skip very short lines
      if (normalized.length < 20) {
        compressed.push(line);
        continue;
      }

      // If we've seen this exact line before, skip it
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      compressed.push(line);
    }

    return compressed.join('\n');
  }

  /**
   * Summarize old messages
   */
  private summarizeMessages(messages: Message[]): string {
    const topics = new Set<string>();
    const keyPoints: string[] = [];

    for (const msg of messages) {
      // Extract key information (simple heuristic)
      const sentences = msg.content.split(/[.!?]+/).filter(s => s.trim().length > 10);

      if (sentences.length > 0) {
        // Take first sentence of each message as key point
        keyPoints.push(sentences[0].trim());
      }
    }

    // Limit summary to max 200 tokens
    let summary = keyPoints.slice(0, 5).join('. ') + '.';

    if (this.estimateTokens(summary) > 200) {
      summary = summary.substring(0, 600) + '...';
    }

    return summary;
  }

  /**
   * Detect which template best matches the prompt
   */
  private detectTemplate(prompt: string): PromptTemplate | null {
    const promptLower = prompt.toLowerCase();

    // Check for code review keywords
    if (promptLower.includes('review') && (promptLower.includes('code') || promptLower.includes('pr'))) {
      return this.promptTemplates.get('code-review') || null;
    }

    // Check for data analysis keywords
    if ((promptLower.includes('analy') || promptLower.includes('data')) &&
        (promptLower.includes('csv') || promptLower.includes('json') || promptLower.includes('excel'))) {
      return this.promptTemplates.get('data-analysis') || null;
    }

    // Check for bug fix keywords
    if (promptLower.includes('bug') || promptLower.includes('error') || promptLower.includes('fix')) {
      return this.promptTemplates.get('bug-fix') || null;
    }

    // Check for documentation keywords
    if (promptLower.includes('document') || promptLower.includes('readme') || promptLower.includes('guide')) {
      return this.promptTemplates.get('documentation') || null;
    }

    // Default to assistant template
    return this.promptTemplates.get('assistant') || null;
  }

  /**
   * Apply template to prompt
   */
  private applyTemplate(template: PromptTemplate, prompt: string): string {
    // Extract variable values from original prompt
    const values: Record<string, string> = {};

    // Simple extraction (in production, use NLP)
    for (const variable of template.variables) {
      // Extract first relevant phrase for each variable
      values[variable] = this.extractVariable(prompt, variable);
    }

    // Replace template variables
    let result = template.template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`{{${key}}}`, value);
    }

    return result;
  }

  /**
   * Extract variable value from prompt
   */
  private extractVariable(prompt: string, variable: string): string {
    // Simple heuristic extraction
    const promptLower = prompt.toLowerCase();

    if (variable === 'language') {
      const languages = ['python', 'javascript', 'typescript', 'java', 'rust', 'go', 'c++'];
      for (const lang of languages) {
        if (promptLower.includes(lang)) return lang;
      }
      return 'code';
    }

    if (variable === 'tools') {
      const tools: string[] = [];
      if (promptLower.includes('web')) tools.push('web');
      if (promptLower.includes('file')) tools.push('files');
      if (promptLower.includes('database') || promptLower.includes('db')) tools.push('database');
      return tools.join(',') || 'all';
    }

    if (variable === 'focus') {
      if (promptLower.includes('performance')) return 'performance';
      if (promptLower.includes('security')) return 'security';
      if (promptLower.includes('user')) return 'UX';
      return 'general';
    }

    // Extract first 3 words as default
    const words = prompt.split(/\s+/).slice(0, 3);
    return words.join(' ');
  }

  /**
   * Generate file ID from content
   */
  private generateFileId(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    // More accurate would be to use tiktoken library
    return Math.ceil(text.length / 4);
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get file content by reference ID
   */
  getFileContent(fileId: string): string | null {
    return this.messageCache.get(fileId) || null;
  }

  /**
   * Get file reference
   */
  getFileReference(fileId: string): FileReference | null {
    return this.fileReferences.get(fileId) || null;
  }

  /**
   * Get optimization statistics
   */
  getStatistics(): any {
    return {
      templatesAvailable: this.promptTemplates.size,
      filesReferenced: this.fileReferences.size,
      cacheSize: this.messageCache.size,
      totalBytesCached: Array.from(this.messageCache.values()).reduce((sum, content) => sum + content.length, 0),
    };
  }

  /**
   * Evict oldest entries to make room for new content
   */
  private evictOldestEntries(bytesNeeded: number): void {
    const entries = Array.from(this.fileReferences.entries())
      .sort((a, b) => a[1].uploadedAt.getTime() - b[1].uploadedAt.getTime());

    let freedBytes = 0;

    for (const [id, ref] of entries) {
      if (freedBytes >= bytesNeeded) break;

      const content = this.messageCache.get(id);
      if (content) {
        freedBytes += content.length;
        this.currentCacheSize -= content.length;
      }

      this.fileReferences.delete(id);
      this.messageCache.delete(id);
    }

    console.log(`[ChatOptimizer] Evicted ${entries.length} entries, freed ${this.formatBytes(freedBytes)}`);
  }

  /**
   * Clear old cache entries
   */
  clearCache(olderThan: number = 3600000): void {
    const now = Date.now();
    let clearedBytes = 0;

    for (const [id, ref] of this.fileReferences.entries()) {
      if (now - ref.uploadedAt.getTime() > olderThan) {
        const content = this.messageCache.get(id);
        if (content) {
          clearedBytes += content.length;
          this.currentCacheSize -= content.length;
        }

        this.fileReferences.delete(id);
        this.messageCache.delete(id);
      }
    }

    if (clearedBytes > 0) {
      console.log(`[ChatOptimizer] Cleared ${this.formatBytes(clearedBytes)} from cache`);
    }
  }
}

// Singleton instance
export const chatOptimizer = new ChatOptimizer();
