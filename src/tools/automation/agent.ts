/**
 * Hybrid Automation Agent
 *
 * Intelligent orchestrator that chooses between Playwright and UI-TARS
 * based on task complexity, platform, and cost considerations.
 */

import { PlaywrightAutomation } from './playwright.js';
import { UITarsAutomation } from './uitars.js';

export interface AutomationTask {
  type: 'web' | 'mobile' | 'desktop' | 'game';
  action: 'click' | 'type' | 'navigate' | 'extract' | 'screenshot' | 'understand' | 'test';
  description: string;
  target?: string; // CSS selector or description
  url?: string;
  value?: string; // For typing
  options?: {
    screenshot?: boolean;
    wait?: number;
    validate?: boolean;
  };
}

export interface AutomationResult {
  success: boolean;
  tool: 'playwright' | 'uitars';
  reason: string; // Why this tool was chosen
  data?: any;
  screenshot?: string;
  executionTime: number;
  cost?: number;
  error?: string;
  transparency: {
    taskAnalysis: string;
    toolSelection: string;
    steps: string[];
  };
}

export interface TaskComplexity {
  score: number; // 0-1, where 0 is simple, 1 is complex
  factors: {
    requiresVision: boolean;
    requiresUnderstanding: boolean;
    hasCssSelector: boolean;
    crossPlatform: boolean;
    dynamicContent: boolean;
  };
  recommendation: 'playwright' | 'uitars';
}

/**
 * Hybrid Automation Agent
 * Intelligently orchestrates Playwright and UI-TARS
 */
export class HybridAutomationAgent {
  private playwright: PlaywrightAutomation;
  private uitars: UITarsAutomation;
  private metrics: {
    playwrightTasks: number;
    uitarsTasks: number;
    totalExecutionTime: number;
    totalCost: number;
  };

  constructor() {
    this.playwright = new PlaywrightAutomation();
    this.uitars = new UITarsAutomation();
    this.metrics = {
      playwrightTasks: 0,
      uitarsTasks: 0,
      totalExecutionTime: 0,
      totalCost: 0,
    };
  }

  /**
   * Analyze task complexity and determine best tool
   */
  analyzeTask(task: AutomationTask): TaskComplexity {
    const factors = {
      requiresVision: this.requiresVision(task),
      requiresUnderstanding: this.requiresUnderstanding(task),
      hasCssSelector: !!task.target && task.target.includes('.') || task.target?.includes('#'),
      crossPlatform: task.type !== 'web',
      dynamicContent: task.description.toLowerCase().includes('dynamic') ||
                      task.description.toLowerCase().includes('understand'),
    };

    // Calculate complexity score
    let score = 0;
    if (factors.requiresVision) score += 0.3;
    if (factors.requiresUnderstanding) score += 0.3;
    if (!factors.hasCssSelector) score += 0.2;
    if (factors.crossPlatform) score += 0.2;

    // Decision logic
    let recommendation: 'playwright' | 'uitars';

    if (factors.crossPlatform) {
      // Mobile/desktop/game requires UI-TARS
      recommendation = 'uitars';
    } else if (factors.hasCssSelector && !factors.requiresVision && !factors.requiresUnderstanding) {
      // Simple web automation with selector -> Playwright
      recommendation = 'playwright';
    } else if (factors.requiresVision || factors.requiresUnderstanding) {
      // Needs AI understanding -> UI-TARS
      recommendation = 'uitars';
    } else if (task.action === 'test' || task.action === 'screenshot') {
      // Testing and screenshots -> Playwright is faster
      recommendation = 'playwright';
    } else {
      // Default to Playwright for web, UI-TARS for others
      recommendation = task.type === 'web' ? 'playwright' : 'uitars';
    }

    return {
      score,
      factors,
      recommendation,
    };
  }

  /**
   * Check if task requires vision understanding
   */
  private requiresVision(task: AutomationTask): boolean {
    const visionKeywords = ['understand', 'recognize', 'find visually', 'looks like', 'appears', 'visual'];
    return visionKeywords.some(keyword => task.description.toLowerCase().includes(keyword));
  }

  /**
   * Check if task requires semantic understanding
   */
  private requiresUnderstanding(task: AutomationTask): boolean {
    const understandingKeywords = ['understand', 'figure out', 'identify', 'recognize'];
    return understandingKeywords.some(keyword => task.description.toLowerCase().includes(keyword)) ||
           task.action === 'understand';
  }

  /**
   * Execute automation task with best tool
   */
  async execute(task: AutomationTask): Promise<AutomationResult> {
    const startTime = Date.now();
    const complexity = this.analyzeTask(task);

    console.log(`\n🤖 Hybrid Agent: Analyzing task...`);
    console.log(`📊 Complexity Score: ${(complexity.score * 100).toFixed(0)}%`);
    console.log(`🎯 Recommended Tool: ${complexity.recommendation.toUpperCase()}`);

    const transparency = {
      taskAnalysis: this.generateTaskAnalysis(task, complexity),
      toolSelection: this.generateToolSelectionReason(complexity),
      steps: [] as string[],
    };

    try {
      let result: any;
      let tool: 'playwright' | 'uitars';
      let executionTime: number;

      if (complexity.recommendation === 'playwright' && this.playwright.isAvailable()) {
        // Use Playwright
        tool = 'playwright';
        transparency.steps.push('🌐 Initializing Playwright browser automation');
        result = await this.playwright.execute(task);
        executionTime = Date.now() - startTime;
        this.metrics.playwrightTasks++;

        transparency.steps.push(...result.steps || []);
        transparency.steps.push(`✅ Playwright execution completed in ${executionTime}ms`);

        return {
          success: result.success,
          tool,
          reason: transparency.toolSelection,
          data: result.data,
          screenshot: result.screenshot,
          executionTime,
          cost: 0, // Playwright is free
          transparency,
        };

      } else if (this.uitars.isAvailable()) {
        // Use UI-TARS
        tool = 'uitars';
        transparency.steps.push('🤖 Initializing UI-TARS vision-based automation');
        result = await this.uitars.execute(task);
        executionTime = Date.now() - startTime;
        this.metrics.uitarsTasks++;

        transparency.steps.push(...result.steps || []);
        transparency.steps.push(`✅ UI-TARS execution completed in ${executionTime}ms`);

        return {
          success: result.success,
          tool,
          reason: transparency.toolSelection,
          data: result.data,
          screenshot: result.screenshot,
          executionTime,
          cost: result.cost || 0.01, // UI-TARS has compute cost
          transparency,
        };

      } else {
        // Fallback to available tool or error
        if (this.playwright.isAvailable()) {
          transparency.steps.push('⚠️ Preferred tool unavailable, falling back to Playwright');
          tool = 'playwright';
          result = await this.playwright.execute(task);
          executionTime = Date.now() - startTime;
          this.metrics.playwrightTasks++;

          return {
            success: result.success,
            tool,
            reason: 'Fallback to Playwright (preferred tool unavailable)',
            data: result.data,
            screenshot: result.screenshot,
            executionTime,
            cost: 0,
            transparency,
          };
        } else {
          throw new Error('No automation tools available. Please ensure Playwright or UI-TARS is installed.');
        }
      }

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      transparency.steps.push(`❌ Error: ${error.message}`);

      return {
        success: false,
        tool: complexity.recommendation,
        reason: transparency.toolSelection,
        error: error.message,
        executionTime,
        transparency,
      };
    } finally {
      this.metrics.totalExecutionTime += Date.now() - startTime;
    }
  }

  /**
   * Generate human-readable task analysis
   */
  private generateTaskAnalysis(task: AutomationTask, complexity: TaskComplexity): string {
    const parts: string[] = [];

    parts.push(`Task: ${task.action} on ${task.type} platform`);

    if (complexity.factors.hasCssSelector) {
      parts.push('✅ Has CSS selector (fast targeting possible)');
    } else {
      parts.push('⚠️ No CSS selector (requires visual identification)');
    }

    if (complexity.factors.requiresVision) {
      parts.push('👁️ Requires vision understanding');
    }

    if (complexity.factors.requiresUnderstanding) {
      parts.push('🧠 Requires semantic understanding');
    }

    if (complexity.factors.crossPlatform) {
      parts.push('📱 Cross-platform (mobile/desktop)');
    }

    parts.push(`Complexity: ${(complexity.score * 100).toFixed(0)}%`);

    return parts.join(' | ');
  }

  /**
   * Generate tool selection reasoning
   */
  private generateToolSelectionReason(complexity: TaskComplexity): string {
    const { recommendation, factors } = complexity;

    if (recommendation === 'playwright') {
      if (factors.hasCssSelector) {
        return '🌐 Playwright chosen: Fast and reliable with CSS selectors available';
      } else {
        return '🌐 Playwright chosen: Simple web automation, no vision required';
      }
    } else {
      if (factors.crossPlatform) {
        return '🤖 UI-TARS chosen: Cross-platform automation required';
      } else if (factors.requiresVision) {
        return '🤖 UI-TARS chosen: Vision-based understanding required';
      } else if (factors.requiresUnderstanding) {
        return '🤖 UI-TARS chosen: Semantic understanding required';
      } else {
        return '🤖 UI-TARS chosen: Complex task requiring AI capabilities';
      }
    }
  }

  /**
   * Get agent metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageExecutionTime: this.metrics.totalExecutionTime /
        (this.metrics.playwrightTasks + this.metrics.uitarsTasks) || 0,
      toolDistribution: {
        playwright: this.metrics.playwrightTasks,
        uitars: this.metrics.uitarsTasks,
        playwrightPercentage: (this.metrics.playwrightTasks /
          (this.metrics.playwrightTasks + this.metrics.uitarsTasks) * 100) || 0,
      },
    };
  }

  /**
   * Close and cleanup
   */
  async close() {
    await this.playwright.close();
    await this.uitars.close();
  }
}

// Export singleton instance
export const hybridAgent = new HybridAutomationAgent();
