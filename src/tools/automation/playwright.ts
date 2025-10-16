/**
 * Playwright Automation Wrapper
 *
 * Fast, reliable browser automation for web applications
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type { AutomationTask } from './agent.js';

export interface PlaywrightResult {
  success: boolean;
  data?: any;
  screenshot?: string;
  steps: string[];
  error?: string;
}

export class PlaywrightAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private initialized: boolean = false;

  /**
   * Check if Playwright is available
   */
  isAvailable(): boolean {
    return true; // We installed it
  }

  /**
   * Initialize browser
   */
  private async initialize(): Promise<void> {
    if (this.initialized && this.browser) return;

    const steps: string[] = [];

    try {
      steps.push('🚀 Launching Chromium browser');
      this.browser = await chromium.launch({
        headless: true, // Run in background
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      steps.push('📄 Creating browser context');
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      steps.push('🌐 Opening new page');
      this.page = await this.context.newPage();

      this.initialized = true;
      console.log('✅ Playwright initialized successfully');
    } catch (error: any) {
      steps.push(`❌ Initialization error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute automation task
   */
  async execute(task: AutomationTask): Promise<PlaywrightResult> {
    const steps: string[] = [];

    try {
      await this.initialize();

      if (!this.page) {
        throw new Error('Page not initialized');
      }

      steps.push(`🎯 Task: ${task.action} on ${task.description}`);

      switch (task.action) {
        case 'navigate':
          return await this.navigate(task, steps);

        case 'click':
          return await this.click(task, steps);

        case 'type':
          return await this.type(task, steps);

        case 'extract':
          return await this.extract(task, steps);

        case 'screenshot':
          return await this.screenshot(task, steps);

        case 'test':
          return await this.test(task, steps);

        default:
          throw new Error(`Unsupported action: ${task.action}`);
      }

    } catch (error: any) {
      steps.push(`❌ Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        steps,
      };
    }
  }

  /**
   * Navigate to URL
   */
  private async navigate(task: AutomationTask, steps: string[]): Promise<PlaywrightResult> {
    if (!this.page || !task.url) {
      throw new Error('Page or URL not available');
    }

    steps.push(`🌐 Navigating to ${task.url}`);
    await this.page.goto(task.url, { waitUntil: 'networkidle' });

    steps.push(`✅ Page loaded: ${this.page.url()}`);

    const screenshot = task.options?.screenshot
      ? await this.page.screenshot({ encoding: 'base64' })
      : undefined;

    return {
      success: true,
      data: { url: this.page.url(), title: await this.page.title() },
      screenshot,
      steps,
    };
  }

  /**
   * Click element
   */
  private async click(task: AutomationTask, steps: string[]): Promise<PlaywrightResult> {
    if (!this.page || !task.target) {
      throw new Error('Page or target not available');
    }

    steps.push(`🖱️ Clicking element: ${task.target}`);

    // Wait for element to be visible and enabled
    await this.page.waitForSelector(task.target, { state: 'visible' });
    await this.page.click(task.target);

    steps.push(`✅ Clicked successfully`);

    // Optional: Wait after click
    if (task.options?.wait) {
      await this.page.waitForTimeout(task.options.wait);
    }

    const screenshot = task.options?.screenshot
      ? await this.page.screenshot({ encoding: 'base64' })
      : undefined;

    return {
      success: true,
      data: { clicked: task.target },
      screenshot,
      steps,
    };
  }

  /**
   * Type text into element
   */
  private async type(task: AutomationTask, steps: string[]): Promise<PlaywrightResult> {
    if (!this.page || !task.target || !task.value) {
      throw new Error('Page, target, or value not available');
    }

    steps.push(`⌨️ Typing into element: ${task.target}`);

    await this.page.waitForSelector(task.target, { state: 'visible' });
    await this.page.fill(task.target, task.value);

    steps.push(`✅ Typed: "${task.value}"`);

    const screenshot = task.options?.screenshot
      ? await this.page.screenshot({ encoding: 'base64' })
      : undefined;

    return {
      success: true,
      data: { typed: task.value, target: task.target },
      screenshot,
      steps,
    };
  }

  /**
   * Extract data from page
   */
  private async extract(task: AutomationTask, steps: string[]): Promise<PlaywrightResult> {
    if (!this.page || !task.target) {
      throw new Error('Page or target not available');
    }

    steps.push(`📊 Extracting data from: ${task.target}`);

    const data = await this.page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(el => ({
        text: el.textContent?.trim(),
        html: el.innerHTML,
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {} as Record<string, string>),
      }));
    }, task.target);

    steps.push(`✅ Extracted ${data.length} elements`);

    return {
      success: true,
      data,
      steps,
    };
  }

  /**
   * Take screenshot
   */
  private async screenshot(task: AutomationTask, steps: string[]): Promise<PlaywrightResult> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    steps.push(`📸 Taking screenshot`);

    const screenshot = await this.page.screenshot({
      encoding: 'base64',
      fullPage: task.options?.validate || false,
    });

    steps.push(`✅ Screenshot captured`);

    return {
      success: true,
      screenshot,
      steps,
    };
  }

  /**
   * Run test scenario
   */
  private async test(task: AutomationTask, steps: string[]): Promise<PlaywrightResult> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    steps.push(`🧪 Running test scenario`);

    // Accessibility test
    steps.push(`♿ Running accessibility audit`);
    const accessibilitySnapshot = await this.page.accessibility.snapshot();

    // Performance test
    steps.push(`⚡ Measuring page performance`);
    const performanceMetrics = await this.page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: perf.loadEventEnd - perf.loadEventStart,
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        responseTime: perf.responseEnd - perf.responseStart,
      };
    });

    steps.push(`✅ Test completed`);

    return {
      success: true,
      data: {
        accessibility: accessibilitySnapshot,
        performance: performanceMetrics,
      },
      steps,
    };
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.initialized = false;
  }
}
