import { Context, Next } from 'hono';
import { BridgeError } from '../types/index.js';

/**
 * ENTERPRISE-GRADE API KEY AUTHENTICATION
 * DEVELOPERS DEVELOPERS DEVELOPERS need SECURITY!
 */

// Simple API key store (in production: use database/Redis)
const apiKeys = new Map<string, {
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  rateLimit: number;
  used: number;
  createdAt: Date;
}>();

// Generate default admin key
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'sk-bridge-' + Math.random().toString(36).substr(2, 32);
apiKeys.set(ADMIN_KEY, {
  name: 'Admin',
  tier: 'enterprise',
  rateLimit: 10000,
  used: 0,
  createdAt: new Date(),
});

console.log(`🔐 Admin API Key: ${ADMIN_KEY}`);

/**
 * Middleware: Require API key authentication
 */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey) {
      throw new BridgeError(
        'API key required. Include: Authorization: Bearer YOUR_KEY',
        'AUTH_REQUIRED',
        401
      );
    }

    const keyData = apiKeys.get(apiKey);
    if (!keyData) {
      throw new BridgeError(
        'Invalid API key',
        'INVALID_API_KEY',
        401
      );
    }

    // Rate limiting
    if (keyData.used >= keyData.rateLimit) {
      throw new BridgeError(
        `Rate limit exceeded (${keyData.rateLimit} requests)`,
        'RATE_LIMIT',
        429
      );
    }

    // Track usage
    keyData.used++;

    // Attach key info to context
    c.set('apiKey', keyData);

    await next();
  };
}

/**
 * Create new API key (admin only)
 */
export function createApiKey(name: string, tier: 'free' | 'pro' | 'enterprise'): string {
  const key = 'sk-bridge-' + Math.random().toString(36).substr(2, 32);

  const rateLimit = {
    free: 100,
    pro: 1000,
    enterprise: 10000,
  }[tier];

  apiKeys.set(key, {
    name,
    tier,
    rateLimit,
    used: 0,
    createdAt: new Date(),
  });

  return key;
}

/**
 * List all API keys (admin only)
 */
export function listApiKeys(): Array<any> {
  return Array.from(apiKeys.entries()).map(([key, data]) => ({
    key: key.substring(0, 20) + '...',
    name: data.name,
    tier: data.tier,
    used: data.used,
    limit: data.rateLimit,
    createdAt: data.createdAt,
  }));
}

/**
 * Get API key stats
 */
export function getKeyStats(apiKey: string) {
  return apiKeys.get(apiKey);
}
