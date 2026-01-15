import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';
import { sanitizeForLog } from '@shared/utils/log-sanitizer.util';

// Only log payloads in non-production environments
const LOG_PAYLOADS = process.env.NODE_ENV !== 'production';

/**
 * WsLoggingInterceptor - Interceptor para logging de eventos WebSocket
 *
 * Responsabilidades:
 * - Log de eventos entrantes (cliente → servidor)
 * - Log de eventos salientes (servidor → cliente)
 * - Métricas de tiempo de procesamiento
 * - Información de contexto (userId, socketId)
 *
 * Security:
 * - In production, only logs metadata (event name, user, duration)
 * - In development, logs sanitized payloads for debugging
 *
 * Uso:
 * @UseInterceptors(WsLoggingInterceptor)
 * @SubscribeMessage('message')
 * handleMessage() { }
 */
@Injectable()
export class WsLoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(WsLoggingInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const client = context.switchToWs().getClient<Socket>();
    const data = context.switchToWs().getData();
    const pattern = context.switchToWs().getPattern();

    const userId = client.data?.userId || 'anonymous';
    const socketId = client.id;

    // Log incoming event - only include sanitized payload in non-production
    if (LOG_PAYLOADS && data && typeof data === 'object') {
      this.logger.debug(
        `Incoming event: ${pattern} | User: ${userId} | Socket: ${socketId}`,
        { data: sanitizeForLog(data) }
      );
    } else {
      this.logger.debug(
        `Incoming event: ${pattern} | User: ${userId} | Socket: ${socketId}`
      );
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (response: any) => {
          const duration = Date.now() - now;
          // Only include sanitized response in non-production
          if (LOG_PAYLOADS && response && typeof response === 'object') {
            this.logger.debug(
              `Outgoing response: ${pattern} | Duration: ${duration}ms | User: ${userId}`,
              { response: sanitizeForLog(response) }
            );
          } else {
            this.logger.debug(
              `Outgoing response: ${pattern} | Duration: ${duration}ms | User: ${userId}`
            );
          }
        },
        error: (error: any) => {
          const duration = Date.now() - now;
          // Log error message but not full error object which might contain sensitive data
          this.logger.error(
            `Event error: ${pattern} | Duration: ${duration}ms | User: ${userId} | Error: ${error?.message || 'Unknown error'}`
          );
        },
      })
    );
  }
}
