/**
 * Sanitizes objects for logging by redacting sensitive fields.
 * Prevents accidental exposure of tokens, passwords, and other sensitive data in logs.
 */

// Fields that should be completely redacted
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'key',
  'credential',
  'credentials',
  'private',
  'privatekey',
  'private_key',
]);

// Fields that should be partially redacted (show first/last few chars)
const PARTIAL_REDACT_FIELDS = new Set([
  'email',
  'username',
  'user',
]);

/**
 * Check if a field name is sensitive (case-insensitive)
 */
function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_FIELDS.has(normalized);
}

/**
 * Check if a field should be partially redacted
 */
function isPartialRedactField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[-_]/g, '');
  return PARTIAL_REDACT_FIELDS.has(normalized);
}

/**
 * Partially redact a value (show first 2 and last 2 chars)
 */
function partialRedact(value: string): string {
  if (value.length <= 6) {
    return '[REDACTED]';
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

/**
 * Sanitize a single value based on its field name
 */
function sanitizeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (isSensitiveField(key)) {
      return '[REDACTED]';
    }
    if (isPartialRedactField(key)) {
      return partialRedact(value);
    }
    // Truncate very long strings to prevent log bloating
    if (value.length > 200) {
      return `${value.slice(0, 200)}...[truncated]`;
    }
  }

  return value;
}

/**
 * Recursively sanitize an object for logging
 */
export function sanitizeForLog<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeForLog(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = sanitizeValue(key, value);
    }
  }

  return sanitized as T;
}

/**
 * Sanitize URL query parameters
 * Used by the Pino request serializer
 */
export function sanitizeQueryParams(query: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!query) {
    return query;
  }
  return sanitizeForLog(query);
}

/**
 * Sanitize URL params (route parameters)
 * Generally these are just IDs, but sanitize just in case
 */
export function sanitizeParams(params: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!params) {
    return params;
  }
  return sanitizeForLog(params);
}
