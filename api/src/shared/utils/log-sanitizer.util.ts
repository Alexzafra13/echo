// Sanitiza objetos para logging, redactando campos sensibles.

// Campos que se redactan completamente
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'streamtoken',
  'stream_token',
  'xstreamtoken',
  'authorization',
  'secret',
  'jwtsecret',
  'jwtrefreshsecret',
  'apikey',
  'api_key',
  'key',
  'credential',
  'credentials',
  'private',
  'privatekey',
  'private_key',
  'cookie',
]);

// Campos que se redactan parcialmente (primeros/últimos caracteres)
const PARTIAL_REDACT_FIELDS = new Set([
  'email',
  'username',
  'user',
]);

function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_FIELDS.has(normalized);
}

function isPartialRedactField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[-_]/g, '');
  return PARTIAL_REDACT_FIELDS.has(normalized);
}

function partialRedact(value: string): string {
  if (value.length <= 6) {
    return '[REDACTED]';
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

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
    if (value.length > 200) {
      return `${value.slice(0, 200)}...[truncated]`;
    }
  }

  return value;
}

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

export function sanitizeQueryParams(query: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!query) {
    return query;
  }
  return sanitizeForLog(query);
}

export function sanitizeParams(params: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!params) {
    return params;
  }
  return sanitizeForLog(params);
}
