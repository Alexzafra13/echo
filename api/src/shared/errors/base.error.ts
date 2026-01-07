/**
 * BaseError - Clase base para errores de dominio
 *
 * Los errores de dominio NO deben contener información HTTP.
 * El mapeo a códigos HTTP se hace en HttpExceptionFilter.
 *
 * Esto permite que la capa de dominio sea independiente del protocolo HTTP.
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
 * Mapeo de códigos de error a status HTTP
 *
 * Centraliza la conversión de errores de dominio a respuestas HTTP.
 * Usado por HttpExceptionFilter para generar respuestas consistentes.
 */
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

/**
 * Obtiene el código HTTP para un código de error de dominio
 * @param code - Código de error (ej: 'NOT_FOUND', 'UNAUTHORIZED')
 * @returns Código HTTP correspondiente (default: 500)
 */
export function getHttpStatusForError(code: string): number {
  return ERROR_HTTP_STATUS_MAP[code] ?? 500;
}