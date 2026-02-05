import { ArgumentsHost, Catch, Injectable } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Socket } from 'socket.io';
import { sanitizeForLog } from '@shared/utils/log-sanitizer.util';

// Only log payloads in non-production environments
const LOG_PAYLOADS = process.env.NODE_ENV !== 'production';

/** Structure for WsException error object (when not a string) */
interface WsExceptionError {
  message?: string;
  code?: string;
}

/**
 * WsExceptionFilter - Filtro global para excepciones de WebSocket
 *
 * Responsabilidades:
 * - Capturar todas las excepciones en gateways
 * - Formatear errores de forma consistente
 * - Logging de errores
 * - Enviar respuesta de error al cliente
 *
 * Formato de error enviado al cliente:
 * {
 *   event: 'error',
 *   data: {
 *     message: 'Error description',
 *     code: 'ERROR_CODE',
 *     timestamp: '2024-11-01T...'
 *   }
 * }
 *
 * Uso:
 * app.useGlobalFilters(new WsExceptionFilter());
 */
@Catch()
@Injectable()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  constructor(
    @InjectPinoLogger(WsExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const data = host.switchToWs().getData();

    // Extraer información del error
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof WsException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        message = error;
      } else {
        const errorObj = error as WsExceptionError;
        message = errorObj.message ?? 'WebSocket error';
        code = errorObj.code ?? 'WS_EXCEPTION';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = 'ERROR';
    }

    // Log error - only include sanitized data in non-production
    const logContext: Record<string, unknown> = {
      message,
      code,
    };

    // Only include data payload in non-production, and sanitize it
    if (LOG_PAYLOADS && data && typeof data === 'object') {
      logContext.data = sanitizeForLog(data);
    }

    // Only include stack trace in non-production
    if (LOG_PAYLOADS && exception instanceof Error) {
      logContext.stack = exception.stack;
    }

    this.logger.error(`WebSocket error on client ${client.id}:`, logContext);

    // Enviar error al cliente
    const errorResponse = {
      event: 'error',
      data: {
        message,
        code,
        timestamp: new Date().toISOString(),
      },
    };

    client.emit('error', errorResponse.data);

    // Llamar al filter base para logging adicional
    super.catch(exception, host);
  }
}
