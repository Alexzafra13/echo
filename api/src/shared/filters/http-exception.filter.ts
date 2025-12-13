import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { BaseError } from '@shared/errors/base.error';

/**
 * HttpExceptionFilter - Maneja todas las excepciones HTTP de forma global
 *
 * Funcionalidad:
 * - Captura todas las excepciones (HTTP y no HTTP)
 * - Log estructurado con Pino
 * - Oculta stack traces en producción
 * - Formato de respuesta consistente
 * - Previene exposición de información sensible
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Determinar status code
    let status: number;

    if (exception instanceof BaseError) {
      // Custom domain errors (UnauthorizedError, ValidationError, etc.)
      status = exception.statusCode;
    } else if (exception instanceof HttpException) {
      // NestJS HTTP exceptions
      status = exception.getStatus();
    } else if (this.isPostgresUuidError(exception)) {
      // PostgreSQL invalid UUID error -> 400 Bad Request
      status = HttpStatus.BAD_REQUEST;
    } else {
      // Unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // Determinar mensaje
    let message: string;
    let error: string;

    if (exception instanceof BaseError) {
      // Custom domain errors
      message = exception.message;
      error = exception.code;
    } else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;
        error = (responseObj.error as string) || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (this.isPostgresUuidError(exception)) {
      message = 'Invalid UUID format';
      error = 'BadRequest';
    } else if (exception instanceof Error) {
      message = 'Internal server error';
      error = 'InternalServerError';
    } else {
      message = 'Internal server error';
      error = 'UnknownError';
    }

    // Construir respuesta
    const errorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      // Solo incluir stack trace en desarrollo
      ...(process.env.NODE_ENV !== 'production' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };

    // Log del error
    if (status >= 500) {
      // Server errors (500+): log como error
      this.logger.error(
        {
          err: exception instanceof Error ? exception : new Error(String(exception)),
          req: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          },
          statusCode: status,
        },
        `HTTP ${status}: ${message}`,
      );
    } else {
      // Client errors (400-499): log como warn
      this.logger.warn(
        {
          statusCode: status,
          message,
          path: request.url,
          method: request.method,
        },
        `HTTP ${status}: ${message}`,
      );
    }

    // Enviar respuesta
    response.status(status).send(errorResponse);
  }

  /**
   * Detecta errores de PostgreSQL por UUID inválido
   * PostgreSQL code 22P02 = invalid_text_representation (incluye UUIDs inválidos)
   */
  private isPostgresUuidError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;

    const error = exception as Error & { code?: string };

    // PostgreSQL error code for invalid input syntax
    if (error.code === '22P02') {
      return error.message?.includes('uuid') || false;
    }

    // Fallback: check message pattern
    return error.message?.includes('invalid input syntax for type uuid') || false;
  }
}
