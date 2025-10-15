import { Context, Next } from 'hono';
import { BridgeError } from '../types/index.js';

/**
 * ENTERPRISE RATE LIMITING
 * Stop the bad guys! Protect our SERVERS!
 */

interface RateLimitConfig {
  windowMs: number;  // Time window in ms
  maxRequests: number;  // Max requests per window
}

const requestCounts = new Map<string, {
  count: number;
  resetAt: number;
}>();

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    // Get identifier (API key or IP)
    const identifier = c.req.header('Authorization') ||
                      c.req.header('X-Forwarded-For') ||
                      c.req.header('X-Real-IP') ||
                      'anonymous';

    const now = Date.now();
    const data = requestCounts.get(identifier);

    // Reset if window expired
    if (!data || now > data.resetAt) {
      requestCounts.set(identifier, {
        count: 1,
        resetAt: now + config.windowMs,
      });

      // Set rate limit headers
      c.header('X-RateLimit-Limit', config.maxRequests.toString());
      c.header('X-RateLimit-Remaining', (config.maxRequests - 1).toString());
      c.header('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());

      await next();
      return;
    }

    // Check if limit exceeded
    if (data.count >= config.maxRequests) {
      const resetIn = Math.ceil((data.resetAt - now) / 1000);

      c.header('X-RateLimit-Limit', config.maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(data.resetAt).toISOString());
      c.header('Retry-After', resetIn.toString());

      throw new BridgeError(
        `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        'RATE_LIMIT_EXCEEDED',
        429,
        { retryAfter: resetIn }
      );
    }

    // Increment count
    data.count++;

    // Set headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (config.maxRequests - data.count).toString());
    c.header('X-RateLimit-Reset', new Date(data.resetAt).toISOString());

    await next();
  };
}

/**
 * Token quota middleware
 */
export function tokenQuota(maxTokensPerHour: number) {
  const tokenUsage = new Map<string, {
    tokens: number;
    resetAt: number;
  }>();

  return async (c: Context, next: Next) => {
    const identifier = c.req.header('Authorization') || 'anonymous';
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    let usage = tokenUsage.get(identifier);

    // Reset if hour expired
    if (!usage || now > usage.resetAt) {
      usage = {
        tokens: 0,
        resetAt: now + hourMs,
      };
      tokenUsage.set(identifier, usage);
    }

    // Check quota before request
    if (usage.tokens >= maxTokensPerHour) {
      throw new BridgeError(
        `Token quota exceeded (${maxTokensPerHour} tokens/hour)`,
        'QUOTA_EXCEEDED',
        429
      );
    }

    await next();

    // Track tokens after request (from response)
    const responseData = await c.res.json();
    if (responseData.usage?.totalTokens) {
      usage.tokens += responseData.usage.totalTokens;
    }
  };
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanup() {
  const now = Date.now();

  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetAt) {
      requestCounts.delete(key);
    }
  }
}

// Auto cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);
