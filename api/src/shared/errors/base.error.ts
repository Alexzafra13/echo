// Clase base para errores de dominio. El mapeo a HTTP se hace en HttpExceptionFilter.
export class BaseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}

// Mapeo de códigos de error a status HTTP
export const ERROR_HTTP_STATUS_MAP: Record<string, number> = {
  // Errores de cliente (4xx)
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  IMAGE_PROCESSING_ERROR: 422,
  SCANNER_ERROR: 409,

  // Errores de servidor (5xx)
  EXTERNAL_API_ERROR: 502,
  TIMEOUT_ERROR: 504,
  INFRASTRUCTURE_ERROR: 503,
  REPOSITORY_ERROR: 500,

  // Default
  INTERNAL_ERROR: 500,
};

export function getHttpStatusForError(code: string): number {
  return ERROR_HTTP_STATUS_MAP[code] ?? 500;
}