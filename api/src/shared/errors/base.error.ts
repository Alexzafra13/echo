/**
 * Base error class for domain errors.
 * Domain errors should NOT contain HTTP-specific information.
 * HTTP status codes are mapped in the HttpExceptionFilter.
 */
export class BaseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}

/**
 * Error code to HTTP status mapping.
 * Used by HttpExceptionFilter to convert domain errors to HTTP responses.
 */
export const ERROR_HTTP_STATUS_MAP: Record<string, number> = {
  // Client errors (4xx)
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  IMAGE_PROCESSING_ERROR: 422,
  SCANNER_ERROR: 409,

  // Server errors (5xx)
  EXTERNAL_API_ERROR: 502,
  TIMEOUT_ERROR: 504,
  INFRASTRUCTURE_ERROR: 503,
  REPOSITORY_ERROR: 500,

  // Default
  INTERNAL_ERROR: 500,
};

/**
 * Get HTTP status code for an error code.
 * Returns 500 for unknown error codes.
 */
export function getHttpStatusForError(code: string): number {
  return ERROR_HTTP_STATUS_MAP[code] ?? 500;
}