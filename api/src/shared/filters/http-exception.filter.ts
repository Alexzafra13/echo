import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { BaseError, getHttpStatusForError } from '@shared/errors/base.error';
import { sanitizeQueryParams, sanitizeParams } from '@shared/utils/log-sanitizer.util';

// Captura todas las excepciones y las convierte a respuestas HTTP consistentes
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

    let status: number;

    if (exception instanceof BaseError) {
      status = getHttpStatusForError(exception.code);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    let message: string;
    let error: string;

    if (exception instanceof BaseError) {
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
    } else if (exception instanceof Error) {
      message = 'Internal server error';
      error = 'InternalServerError';
    } else {
      message = 'Internal server error';
      error = 'UnknownError';
    }

    const errorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV !== 'production' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };

    if (status >= 500) {
      this.logger.error(
        {
          err: exception instanceof Error ? exception : new Error(String(exception)),
          req: {
            method: request.method,
            url: request.url,
            params: sanitizeParams(request.params as Record<string, unknown>),
            query: sanitizeQueryParams(request.query as Record<string, unknown>),
          },
          statusCode: status,
        },
        `HTTP ${status}: ${message}`,
      );
    } else {
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

    response.status(status).send(errorResponse);
  }
}
