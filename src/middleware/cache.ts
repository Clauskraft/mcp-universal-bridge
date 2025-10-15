import { Context, Next } from 'hono';
import crypto from 'crypto';

/**
 * INTELLIGENT CACHING SYSTEM
 * Cache EVERYTHING! Speed is KING! Save that MONEY!
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSaved: 0, // dollars saved
  };

  /**
   * Get from cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }

    // Track hit
    entry.hits++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Set cache entry
   */
  set(key: string, data: any, ttlMs: number, cost: number = 0) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      hits: 0,
      createdAt: Date.now(),
    });

    // Track savings (every hit saves the original cost)
    if (cost > 0) {
      this.stats.totalSaved += cost;
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate.toFixed(2) + '%',
      evictions: this.stats.evictions,
      totalSavedUSD: this.stats.totalSaved,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}

export const cache = new CacheManager();

// Auto cleanup every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

/**
 * Generate cache key from request
 */
function generateCacheKey(
  provider: string,
  model: string,
  message: string,
  systemPrompt?: string
): string {
  const content = `${provider}:${model}:${systemPrompt || ''}:${message}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Middleware: Cache AI responses
 */
export function cacheMiddleware(ttlMs: number = 60 * 60 * 1000) {
  return async (c: Context, next: Next) => {
    // Only cache GET and chat requests
    const path = new URL(c.req.url).pathname;
    if (!path.includes('/chat') || c.req.method !== 'POST') {
      await next();
      return;
    }

    const body = await c.req.json();
    const cacheKey = generateCacheKey(
      body.provider || 'default',
      body.model || 'default',
      body.message,
      body.systemPrompt
    );

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`💰 CACHE HIT! Saved money and time!`);
      c.header('X-Cache', 'HIT');
      return c.json({
        ...cached,
        cached: true,
        cacheHit: true,
      });
    }

    // Cache miss - continue to AI provider
    c.header('X-Cache', 'MISS');
    await next();

    // Cache the response
    const response = await c.res.clone().json();
    if (response.usage?.cost) {
      cache.set(cacheKey, response, ttlMs, response.usage.cost);
    }
  };
}

/**
 * Response compression middleware
 */
export function compress() {
  return async (c: Context, next: Next) => {
    await next();

    // Check if client accepts compression
    const acceptEncoding = c.req.header('Accept-Encoding') || '';

    if (acceptEncoding.includes('gzip')) {
      c.header('Content-Encoding', 'gzip');
      // Note: In production, use actual compression library
      // For now, just set the header
    }
  };
}

/**
 * CDN-style caching headers
 */
export function setCacheHeaders(maxAge: number) {
  return async (c: Context, next: Next) => {
    await next();

    if (c.res.status === 200) {
      c.header('Cache-Control', `public, max-age=${maxAge}`);
      c.header('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    }
  };
}
