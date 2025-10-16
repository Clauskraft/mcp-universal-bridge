import validator from 'validator';
import { Context, Next } from 'hono';

/**
 * Sanitization utilities for user input
 * Prevents XSS, SQL injection, and other injection attacks
 */

/**
 * Sanitize a string by escaping HTML entities and removing dangerous patterns
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Escape HTML entities
  let sanitized = validator.escape(input);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove potential script injection patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  return sanitized;
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize SQL query parameters
 */
export function sanitizeSQLInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Escape HTML first
  let sanitized = validator.escape(input);

  // Remove SQL comment patterns
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');

  // Remove semicolons at the end (prevent query chaining)
  sanitized = sanitized.replace(/;+$/g, '');

  return sanitized;
}

/**
 * Validate file paths to prevent directory traversal attacks
 */
export function sanitizeFilePath(path: string): string {
  if (!path || typeof path !== 'string') return '';

  // Remove directory traversal patterns
  let sanitized = path.replace(/\.\./g, '');
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '');

  return sanitized;
}

/**
 * Middleware to sanitize request body
 */
export async function sanitizeRequestBody(c: Context, next: Next) {
  try {
    const contentType = c.req.header('content-type');

    if (contentType?.includes('application/json')) {
      const body = await c.req.json();
      const sanitized = sanitizeObject(body);

      // Replace the request body with sanitized version
      c.set('sanitizedBody', sanitized);
    }
  } catch (error) {
    // If parsing fails, continue without sanitization
    console.warn('⚠️ Failed to parse request body for sanitization:', error);
  }

  await next();
}

/**
 * Helper to get sanitized body from context
 */
export function getSanitizedBody(c: Context): any {
  return c.get('sanitizedBody') || {};
}
