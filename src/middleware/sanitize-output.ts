/**
 * Output Sanitization Middleware
 * Prevents API keys and sensitive data from leaking in responses, logs, and errors
 */

interface SanitizationPattern {
  pattern: RegExp;
  replacement: string;
  name: string;
}

const SENSITIVE_PATTERNS: SanitizationPattern[] = [
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-api03-[a-zA-Z0-9_-]{95}/g,
    replacement: 'sk-ant-***REDACTED***',
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-proj-[a-zA-Z0-9_-]{100,}/g,
    replacement: 'sk-proj-***REDACTED***',
  },
  {
    name: 'OpenAI Legacy Key',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    replacement: 'sk-***REDACTED***',
  },
  {
    name: 'Google API Key',
    pattern: /AIza[a-zA-Z0-9_-]{35}/g,
    replacement: 'AIza***REDACTED***',
  },
  {
    name: 'xAI API Key',
    pattern: /xai-[a-zA-Z0-9_-]{40,}/g,
    replacement: 'xai-***REDACTED***',
  },
  {
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    replacement: 'ghp_***REDACTED***',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    replacement: 'AKIA***REDACTED***',
  },
  {
    name: 'Generic Bearer Token',
    pattern: /Bearer [a-zA-Z0-9_-]{32,}/g,
    replacement: 'Bearer ***REDACTED***',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    replacement: 'eyJ***REDACTED***',
  },
];

/**
 * Sanitize a string by removing sensitive data
 */
export function sanitizeString(text: string): string {
  if (!text) return text;

  let sanitized = text;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (!obj) return obj;

  // Handle primitive types
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Redact known sensitive keys
    if (key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('apikey')) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize error responses
 */
export function sanitizeErrorMiddleware() {
  return async (err: Error, c: any) => {
    // Sanitize error message
    const sanitizedMessage = sanitizeString(err.message);

    // Sanitize error stack
    const sanitizedStack = err.stack ? sanitizeString(err.stack) : undefined;

    // Log sanitized error (safe for logs)
    console.error('[SANITIZED ERROR]', {
      message: sanitizedMessage,
      name: err.name,
      timestamp: new Date().toISOString(),
    });

    // Return sanitized error to client
    return c.json({
      error: sanitizedMessage,
      code: (err as any).code || 'INTERNAL_ERROR',
    }, (err as any).statusCode || 500);
  };
}

/**
 * Sanitize console.log globally
 */
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

export function enableGlobalLoggingSanitization() {
  console.log = (...args: any[]) => {
    const sanitized = args.map(arg =>
      typeof arg === 'string' ? sanitizeString(arg) : sanitizeObject(arg)
    );
    originalLog.apply(console, sanitized);
  };

  console.error = (...args: any[]) => {
    const sanitized = args.map(arg =>
      typeof arg === 'string' ? sanitizeString(arg) : sanitizeObject(arg)
    );
    originalError.apply(console, sanitized);
  };

  console.warn = (...args: any[]) => {
    const sanitized = args.map(arg =>
      typeof arg === 'string' ? sanitizeString(arg) : sanitizeObject(arg)
    );
    originalWarn.apply(console, sanitized);
  };
}

/**
 * Middleware to sanitize all responses
 */
export function sanitizeResponseMiddleware() {
  return async (c: any, next: any) => {
    await next();

    // Sanitize response body if JSON
    const contentType = c.res.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        const originalJson = c.res.json;

        c.res.json = function(data: any, init?: any) {
          const sanitized = sanitizeObject(data);
          return originalJson.call(this, sanitized, init);
        };
      } catch (e) {
        // Response already sent, skip sanitization
      }
    }
  };
}

/**
 * Check if string contains sensitive data
 */
export function containsSensitiveData(text: string): boolean {
  if (!text) return false;

  for (const { pattern } of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Get sanitization statistics
 */
export function getSanitizationStats() {
  return {
    patternsConfigured: SENSITIVE_PATTERNS.length,
    patterns: SENSITIVE_PATTERNS.map(p => ({
      name: p.name,
      pattern: p.pattern.source,
    })),
  };
}
