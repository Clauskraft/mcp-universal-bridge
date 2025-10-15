import { Context, Next } from 'hono';

/**
 * PROMETHEUS-STYLE METRICS
 * MEASURE MEASURE MEASURE! If you can't measure it, you can't manage it!
 */

interface Metric {
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private summaries = new Map<string, { count: number; sum: number }>();

  /**
   * Increment a counter
   */
  inc(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  /**
   * Set a gauge value
   */
  set(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Observe a value (for histograms)
   */
  observe(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * Record a summary
   */
  summary(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    const current = this.summaries.get(key) || { count: 0, sum: 0 };
    current.count++;
    current.sum += value;
    this.summaries.set(key, current);
  }

  /**
   * Get all metrics in Prometheus format
   */
  getMetrics(): string {
    let output = '';

    // Counters
    output += '# HELP http_requests_total Total HTTP requests\n';
    output += '# TYPE http_requests_total counter\n';
    for (const [key, value] of this.counters.entries()) {
      output += `http_requests_total{${key}} ${value}\n`;
    }

    // Gauges
    output += '\n# HELP active_sessions Currently active sessions\n';
    output += '# TYPE active_sessions gauge\n';
    for (const [key, value] of this.gauges.entries()) {
      output += `active_sessions{${key}} ${value}\n`;
    }

    // Histograms (simplified - showing percentiles)
    output += '\n# HELP http_request_duration_ms HTTP request duration\n';
    output += '# TYPE http_request_duration_ms histogram\n';
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        const sorted = values.sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        output += `http_request_duration_ms{${key},quantile="0.5"} ${p50}\n`;
        output += `http_request_duration_ms{${key},quantile="0.95"} ${p95}\n`;
        output += `http_request_duration_ms{${key},quantile="0.99"} ${p99}\n`;
      }
    }

    // Summaries
    output += '\n# HELP ai_tokens_total Total AI tokens used\n';
    output += '# TYPE ai_tokens_total summary\n';
    for (const [key, data] of this.summaries.entries()) {
      const avg = data.count > 0 ? data.sum / data.count : 0;
      output += `ai_tokens_total{${key}} ${data.sum}\n`;
      output += `ai_tokens_count{${key}} ${data.count}\n`;
      output += `ai_tokens_avg{${key}} ${avg}\n`;
    }

    return output;
  }

  /**
   * Get metrics as JSON
   */
  getMetricsJSON() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([k, v]) => [
          k,
          {
            count: v.length,
            min: Math.min(...v),
            max: Math.max(...v),
            avg: v.reduce((a, b) => a + b, 0) / v.length,
          },
        ])
      ),
      summaries: Object.fromEntries(this.summaries),
    };
  }

  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
}

export const metrics = new MetricsCollector();

/**
 * Middleware to track request metrics
 */
export function trackMetrics() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const path = new URL(c.req.url).pathname;

    // Track request
    metrics.inc('http_requests_total', 1, {
      method: c.req.method,
      path,
    });

    try {
      await next();

      // Track success
      const duration = Date.now() - start;
      metrics.observe('http_request_duration_ms', duration, {
        method: c.req.method,
        path,
        status: c.res.status.toString(),
      });
    } catch (error) {
      // Track error
      metrics.inc('http_requests_errors_total', 1, {
        method: c.req.method,
        path,
      });
      throw error;
    }
  };
}

/**
 * Track AI provider metrics
 */
export function trackAIMetrics(
  provider: string,
  model: string,
  tokens: number,
  latency: number,
  cost: number
) {
  metrics.summary('ai_tokens_total', tokens, { provider, model });
  metrics.observe('ai_request_duration_ms', latency, { provider, model });
  metrics.summary('ai_cost_usd', cost, { provider, model });
  metrics.inc('ai_requests_total', 1, { provider, model });
}
