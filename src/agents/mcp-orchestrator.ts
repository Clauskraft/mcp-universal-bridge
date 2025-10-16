/**
 * MCP Orchestrator Agent
 *
 * Intelligent agent der:
 * 1. Analyserer opgaver og vælger den rigtige MCP server
 * 2. Er proaktiv i at foreslå løsninger
 * 3. Kombinerer flere MCP servere når nødvendigt
 * 4. Lærer af resultater og optimerer valg
 */

import { BridgeError } from '../types/index.js';

/**
 * Task Analysis Result
 */
interface TaskAnalysis {
  taskType: TaskType;
  complexity: number; // 0-1
  requiredCapabilities: string[];
  suggestedServers: MCPServerRecommendation[];
  reasoning: string;
  proactiveFlags: string[];
}

/**
 * MCP Server Recommendation
 */
interface MCPServerRecommendation {
  server: MCPServer;
  confidence: number; // 0-1
  reasoning: string;
  priority: number; // 1 = primary, 2 = secondary, 3 = optional
}

/**
 * Task Types
 */
type TaskType =
  | 'code_analysis'
  | 'code_search'
  | 'code_edit'
  | 'documentation'
  | 'ui_component'
  | 'testing'
  | 'complex_reasoning'
  | 'pattern_transformation'
  | 'symbol_operation'
  | 'unknown';

/**
 * MCP Servers
 */
type MCPServer =
  | 'serena'
  | 'context7'
  | 'magic'
  | 'playwright'
  | 'sequential-thinking'
  | 'logo-search';

/**
 * Execution Strategy
 */
interface ExecutionStrategy {
  primaryServer: MCPServer;
  secondaryServers: MCPServer[];
  executionOrder: 'sequential' | 'parallel' | 'conditional';
  fallbackStrategy: string;
  optimizations: string[];
}

/**
 * Learning Entry
 */
interface LearningEntry {
  taskType: TaskType;
  serversUsed: MCPServer[];
  success: boolean;
  duration: number;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
}

/**
 * MCP Orchestrator Agent
 */
export class MCPOrchestratorAgent {
  private learningHistory: LearningEntry[] = [];
  private serverCapabilities: Map<MCPServer, string[]> = new Map();
  private performanceMetrics: Map<MCPServer, PerformanceMetric> = new Map();

  constructor() {
    this.initializeServerCapabilities();
    this.initializePerformanceMetrics();
    console.log('[MCPOrchestrator] Agent initialized');
  }

  /**
   * Initialize server capabilities map
   */
  private initializeServerCapabilities(): void {
    this.serverCapabilities.set('serena', [
      'symbol_operations',
      'find_symbol',
      'find_references',
      'rename_symbol',
      'code_navigation',
      'semantic_search',
      'project_memory',
      'session_persistence',
      'onboarding',
      'large_codebase',
      'multi_language',
    ]);

    this.serverCapabilities.set('context7', [
      'documentation_lookup',
      'library_docs',
      'framework_patterns',
      'api_reference',
      'code_examples',
      'best_practices',
      'version_specific',
    ]);

    this.serverCapabilities.set('magic', [
      'ui_generation',
      '21st_dev_components',
      'react_components',
      'vue_components',
      'design_system',
      'modern_ui',
      'accessibility',
      'responsive_design',
    ]);

    this.serverCapabilities.set('playwright', [
      'browser_automation',
      'e2e_testing',
      'visual_testing',
      'screenshot',
      'form_interaction',
      'navigation',
      'accessibility_testing',
      'real_browser',
    ]);

    this.serverCapabilities.set('sequential-thinking', [
      'complex_reasoning',
      'multi_step_analysis',
      'hypothesis_testing',
      'structured_thinking',
      'problem_decomposition',
      'verification',
      'debugging_logic',
    ]);

    this.serverCapabilities.set('logo-search', [
      'logo_lookup',
      'brand_assets',
      'svg_icons',
      'tsx_components',
      'jsx_components',
    ]);
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): void {
    const servers: MCPServer[] = ['serena', 'context7', 'magic', 'playwright', 'sequential-thinking', 'logo-search'];

    servers.forEach(server => {
      this.performanceMetrics.set(server, {
        averageDuration: 0,
        successRate: 1.0,
        usageCount: 0,
        lastUsed: null,
      });
    });
  }

  /**
   * Analyze task and recommend MCP servers
   */
  analyzeTask(taskDescription: string, context?: any): TaskAnalysis {
    console.log('[MCPOrchestrator] Analyzing task:', taskDescription);

    const taskType = this.classifyTask(taskDescription, context);
    const complexity = this.assessComplexity(taskDescription, context);
    const requiredCapabilities = this.extractRequiredCapabilities(taskDescription, taskType);
    const suggestedServers = this.recommendServers(taskType, requiredCapabilities, complexity);
    const proactiveFlags = this.identifyProactiveOpportunities(taskDescription, context);

    const analysis: TaskAnalysis = {
      taskType,
      complexity,
      requiredCapabilities,
      suggestedServers,
      reasoning: this.generateReasoning(taskType, suggestedServers),
      proactiveFlags,
    };

    console.log('[MCPOrchestrator] Analysis complete:', analysis);
    return analysis;
  }

  /**
   * Classify task type
   */
  private classifyTask(description: string, context?: any): TaskType {
    const lower = description.toLowerCase();

    // Code analysis patterns
    if (lower.match(/analys|understand|explain|investigate|explore/)) {
      if (lower.match(/symbol|class|function|method|variable/)) {
        return 'symbol_operation';
      }
      return 'code_analysis';
    }

    // Code search patterns
    if (lower.match(/find|search|locate|where is|show me/)) {
      return 'code_search';
    }

    // Code edit patterns
    if (lower.match(/change|modify|edit|update|refactor|rename/)) {
      if (lower.match(/symbol|class|function|method|rename/)) {
        return 'symbol_operation';
      }
      return 'code_edit';
    }

    // Documentation patterns
    if (lower.match(/document|docs|api reference|how to|guide/)) {
      return 'documentation';
    }

    // UI patterns
    if (lower.match(/ui|component|button|form|modal|card|navbar/)) {
      return 'ui_component';
    }

    // Testing patterns
    if (lower.match(/test|e2e|screenshot|automation|browser/)) {
      return 'testing';
    }

    // Complex reasoning patterns
    if (lower.match(/debug|figure out|complex|analyze.*and|multiple steps/)) {
      return 'complex_reasoning';
    }

    // Pattern transformation
    if (lower.match(/transform|convert|migrate|replace all|bulk/)) {
      return 'pattern_transformation';
    }

    return 'unknown';
  }

  /**
   * Assess task complexity (0-1)
   */
  private assessComplexity(description: string, context?: any): number {
    let complexity = 0.3; // Base complexity

    const lower = description.toLowerCase();

    // Increase complexity for multiple files
    if (lower.match(/all files|multiple files|entire project|codebase/)) {
      complexity += 0.3;
    }

    // Increase for multi-step operations
    if (lower.match(/and then|after that|multiple steps|first.*then/)) {
      complexity += 0.2;
    }

    // Increase for vague requirements
    if (lower.match(/maybe|probably|not sure|could|might/)) {
      complexity += 0.2;
    }

    // Increase for architectural changes
    if (lower.match(/architect|redesign|refactor|migrate|restructure/)) {
      complexity += 0.3;
    }

    return Math.min(complexity, 1.0);
  }

  /**
   * Extract required capabilities
   */
  private extractRequiredCapabilities(description: string, taskType: TaskType): string[] {
    const capabilities: string[] = [];
    const lower = description.toLowerCase();

    // Symbol operations
    if (lower.match(/rename|find references|symbol/)) {
      capabilities.push('symbol_operations', 'find_symbol', 'find_references');
    }

    // Documentation
    if (lower.match(/docs|documentation|api|reference/)) {
      capabilities.push('documentation_lookup', 'library_docs');
    }

    // UI
    if (lower.match(/ui|component|design/)) {
      capabilities.push('ui_generation', 'modern_ui');
    }

    // Browser testing
    if (lower.match(/test|browser|e2e|screenshot/)) {
      capabilities.push('browser_automation', 'e2e_testing');
    }

    // Complex reasoning
    if (lower.match(/complex|debug|analyze|figure out/)) {
      capabilities.push('complex_reasoning', 'structured_thinking');
    }

    // Large codebase
    if (lower.match(/entire|all|project-wide|codebase/)) {
      capabilities.push('large_codebase', 'semantic_search');
    }

    return capabilities;
  }

  /**
   * Recommend MCP servers based on analysis
   */
  private recommendServers(
    taskType: TaskType,
    requiredCapabilities: string[],
    complexity: number
  ): MCPServerRecommendation[] {
    const recommendations: MCPServerRecommendation[] = [];

    // Match servers to required capabilities
    this.serverCapabilities.forEach((capabilities, server) => {
      const matchCount = requiredCapabilities.filter(req =>
        capabilities.includes(req)
      ).length;

      if (matchCount > 0) {
        const confidence = matchCount / requiredCapabilities.length;
        const performance = this.performanceMetrics.get(server);
        const adjustedConfidence = confidence * (performance?.successRate || 1.0);

        recommendations.push({
          server,
          confidence: adjustedConfidence,
          reasoning: this.generateServerReasoning(server, capabilities, requiredCapabilities),
          priority: this.determinePriority(adjustedConfidence, taskType, server),
        });
      }
    });

    // Add sequential-thinking for complex tasks
    if (complexity > 0.7 && !recommendations.find(r => r.server === 'sequential-thinking')) {
      recommendations.push({
        server: 'sequential-thinking',
        confidence: complexity,
        reasoning: 'High complexity task benefits from structured reasoning',
        priority: 1,
      });
    }

    // Sort by priority and confidence
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.confidence - a.confidence;
    });

    return recommendations;
  }

  /**
   * Generate reasoning for server recommendation
   */
  private generateServerReasoning(
    server: MCPServer,
    serverCapabilities: string[],
    requiredCapabilities: string[]
  ): string {
    const matches = requiredCapabilities.filter(req => serverCapabilities.includes(req));
    return `${server} provides: ${matches.join(', ')}`;
  }

  /**
   * Determine priority for server
   */
  private determinePriority(confidence: number, taskType: TaskType, server: MCPServer): number {
    // Primary recommendations (priority 1)
    if (confidence > 0.8) return 1;

    // Task-specific primary servers
    if (taskType === 'symbol_operation' && server === 'serena') return 1;
    if (taskType === 'documentation' && server === 'context7') return 1;
    if (taskType === 'ui_component' && server === 'magic') return 1;
    if (taskType === 'testing' && server === 'playwright') return 1;
    if (taskType === 'complex_reasoning' && server === 'sequential-thinking') return 1;

    // Secondary recommendations (priority 2)
    if (confidence > 0.5) return 2;

    // Optional recommendations (priority 3)
    return 3;
  }

  /**
   * Generate overall reasoning
   */
  private generateReasoning(taskType: TaskType, servers: MCPServerRecommendation[]): string {
    const primary = servers.find(s => s.priority === 1);
    const secondary = servers.filter(s => s.priority === 2);

    let reasoning = `Task type: ${taskType}. `;

    if (primary) {
      reasoning += `Primary recommendation: ${primary.server} (${(primary.confidence * 100).toFixed(0)}% confidence). `;
    }

    if (secondary.length > 0) {
      reasoning += `Secondary options: ${secondary.map(s => s.server).join(', ')}. `;
    }

    return reasoning;
  }

  /**
   * Identify proactive opportunities
   */
  private identifyProactiveOpportunities(description: string, context?: any): string[] {
    const flags: string[] = [];
    const lower = description.toLowerCase();

    // Suggest documentation lookup
    if (lower.match(/implement|use|integrate/) && lower.match(/library|framework|package/)) {
      flags.push('SUGGEST_DOCUMENTATION: Consider using context7 to check official docs first');
    }

    // Suggest symbol search before editing
    if (lower.match(/change|edit|modify/) && !lower.match(/find|search/)) {
      flags.push('SUGGEST_SEARCH: Consider using serena to find all references before editing');
    }

    // Suggest UI components
    if (lower.match(/create.*page|build.*interface|design.*ui/) && !lower.match(/component/)) {
      flags.push('SUGGEST_COMPONENTS: Consider breaking down into reusable components with magic');
    }

    // Suggest testing
    if (lower.match(/implement|create|add/) && !lower.match(/test/)) {
      flags.push('SUGGEST_TESTING: Consider adding tests with playwright after implementation');
    }

    // Suggest complexity analysis
    if (lower.match(/bug|error|doesn't work|broken/) && !lower.match(/analyze/)) {
      flags.push('SUGGEST_ANALYSIS: Consider using sequential-thinking to debug systematically');
    }

    // Suggest memory/onboarding
    if (lower.match(/new project|first time|unfamiliar/) && !lower.match(/onboard/)) {
      flags.push('SUGGEST_ONBOARDING: Consider using serena onboarding to understand project structure');
    }

    return flags;
  }

  /**
   * Create execution strategy
   */
  createExecutionStrategy(analysis: TaskAnalysis): ExecutionStrategy {
    const primary = analysis.suggestedServers.find(s => s.priority === 1);
    const secondary = analysis.suggestedServers.filter(s => s.priority === 2 || s.priority === 3);

    if (!primary) {
      throw new BridgeError(
        'No suitable MCP server found for task',
        'NO_SERVER_MATCH',
        400
      );
    }

    // Determine execution order
    let executionOrder: 'sequential' | 'parallel' | 'conditional' = 'sequential';

    if (analysis.complexity > 0.7) {
      executionOrder = 'sequential'; // Complex tasks need careful ordering
    } else if (secondary.length > 1) {
      executionOrder = 'parallel'; // Multiple optional servers can run parallel
    }

    // Build strategy
    const strategy: ExecutionStrategy = {
      primaryServer: primary.server,
      secondaryServers: secondary.map(s => s.server),
      executionOrder,
      fallbackStrategy: this.createFallbackStrategy(primary.server),
      optimizations: this.suggestOptimizations(analysis),
    };

    console.log('[MCPOrchestrator] Execution strategy:', strategy);
    return strategy;
  }

  /**
   * Create fallback strategy
   */
  private createFallbackStrategy(primaryServer: MCPServer): string {
    const fallbacks: Record<MCPServer, string> = {
      'serena': 'If serena fails, try native grep/glob tools for basic search',
      'context7': 'If context7 fails, try web search for documentation',
      'magic': 'If magic fails, manually code UI components',
      'playwright': 'If playwright fails, use manual testing or unit tests',
      'sequential-thinking': 'If sequential-thinking fails, use standard reasoning',
      'logo-search': 'If logo-search fails, use manual SVG or search online',
    };

    return fallbacks[primaryServer] || 'Use native tools as fallback';
  }

  /**
   * Suggest optimizations
   */
  private suggestOptimizations(analysis: TaskAnalysis): string[] {
    const optimizations: string[] = [];

    // Token efficiency
    if (analysis.complexity > 0.6) {
      optimizations.push('USE_SYMBOL_COMPRESSION: Use symbols and abbreviations to save tokens');
    }

    // Parallel execution
    if (analysis.suggestedServers.length > 2) {
      optimizations.push('PARALLEL_EXECUTION: Execute independent server calls in parallel');
    }

    // Caching
    if (analysis.taskType === 'documentation' || analysis.taskType === 'code_search') {
      optimizations.push('ENABLE_CACHING: Cache results for repeated queries');
    }

    // Batch operations
    if (analysis.taskType === 'code_edit' || analysis.taskType === 'pattern_transformation') {
      optimizations.push('BATCH_OPERATIONS: Combine multiple edits into single operation');
    }

    return optimizations;
  }

  /**
   * Record execution result for learning
   */
  recordExecution(
    taskType: TaskType,
    serversUsed: MCPServer[],
    success: boolean,
    duration: number,
    userFeedback?: 'positive' | 'negative' | 'neutral'
  ): void {
    const entry: LearningEntry = {
      taskType,
      serversUsed,
      success,
      duration,
      userFeedback,
      timestamp: new Date(),
    };

    this.learningHistory.push(entry);

    // Update performance metrics
    serversUsed.forEach(server => {
      const metrics = this.performanceMetrics.get(server);
      if (metrics) {
        metrics.usageCount++;
        metrics.lastUsed = new Date();
        metrics.averageDuration = (metrics.averageDuration * (metrics.usageCount - 1) + duration) / metrics.usageCount;

        if (success) {
          metrics.successRate = (metrics.successRate * (metrics.usageCount - 1) + 1) / metrics.usageCount;
        } else {
          metrics.successRate = (metrics.successRate * (metrics.usageCount - 1)) / metrics.usageCount;
        }
      }
    });

    console.log('[MCPOrchestrator] Execution recorded:', entry);
    this.optimizeFromLearning();
  }

  /**
   * Optimize recommendations based on learning
   */
  private optimizeFromLearning(): void {
    // Analyze patterns in learning history
    const recentHistory = this.learningHistory.slice(-50); // Last 50 executions

    // Find successful patterns
    const successfulPatterns: Map<string, number> = new Map();
    recentHistory.forEach(entry => {
      if (entry.success) {
        const pattern = `${entry.taskType}:${entry.serversUsed.join(',')}`;
        successfulPatterns.set(pattern, (successfulPatterns.get(pattern) || 0) + 1);
      }
    });

    console.log('[MCPOrchestrator] Learning optimization complete. Successful patterns:',
      Array.from(successfulPatterns.entries()).slice(0, 5)
    );
  }

  /**
   * Get performance statistics
   */
  getStatistics(): any {
    return {
      totalExecutions: this.learningHistory.length,
      serverMetrics: Object.fromEntries(this.performanceMetrics),
      recentSuccessRate: this.calculateRecentSuccessRate(),
      topPerformingServers: this.getTopPerformingServers(),
    };
  }

  /**
   * Calculate recent success rate
   */
  private calculateRecentSuccessRate(): number {
    const recent = this.learningHistory.slice(-20);
    if (recent.length === 0) return 1.0;

    const successful = recent.filter(e => e.success).length;
    return successful / recent.length;
  }

  /**
   * Get top performing servers
   */
  private getTopPerformingServers(): MCPServer[] {
    return Array.from(this.performanceMetrics.entries())
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .slice(0, 3)
      .map(entry => entry[0]);
  }
}

// Types
interface PerformanceMetric {
  averageDuration: number;
  successRate: number;
  usageCount: number;
  lastUsed: Date | null;
}

// Export singleton instance
export const mcpOrchestrator = new MCPOrchestratorAgent();
