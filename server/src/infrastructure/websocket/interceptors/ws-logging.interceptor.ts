import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';

/**
 * WsLoggingInterceptor - Interceptor para logging de eventos WebSocket
 *
 * Responsabilidades:
 * - Log de eventos entrantes (cliente → servidor)
 * - Log de eventos salientes (servidor → cliente)
 * - Métricas de tiempo de procesamiento
 * - Información de contexto (userId, socketId)
 *
 * Uso:
 * @UseInterceptors(WsLoggingInterceptor)
 * @SubscribeMessage('message')
 * handleMessage() { }
 */
@Injectable()
export class WsLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WsLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const client = context.switchToWs().getClient<Socket>();
    const data = context.switchToWs().getData();
    const pattern = context.switchToWs().getPattern();

    const userId = client.data?.userId || 'anonymous';
    const socketId = client.id;

    // Log del evento entrante
    this.logger.debug(
      `📨 Incoming event: ${pattern} | User: ${userId} | Socket: ${socketId}`,
      { data }
    );

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - now;
          this.logger.debug(
            `📤 Outgoing response: ${pattern} | Duration: ${duration}ms | User: ${userId}`,
            { response }
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `❌ Event error: ${pattern} | Duration: ${duration}ms | User: ${userId}`,
            error
          );
        },
      })
    );
  }
}
