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

    // Log del evento entrante
    this.logger.debug(
      `📨 Incoming event: ${pattern} | User: ${userId} | Socket: ${socketId}`,
      { data }
    );

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (response: any) => {
          const duration = Date.now() - now;
          this.logger.debug(
            `📤 Outgoing response: ${pattern} | Duration: ${duration}ms | User: ${userId}`,
            { response }
          );
        },
        error: (error: any) => {
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
