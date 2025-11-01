import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WsThrottlerGuard - Rate limiting para eventos WebSocket
 *
 * Responsabilidades:
 * - Limitar número de eventos por segundo por cliente
 * - Prevenir spam y abuse
 * - Liberar memoria de clientes desconectados
 *
 * Configuración por defecto:
 * - 20 eventos por segundo por cliente
 * - Ventana de tiempo: 1 segundo
 *
 * Uso:
 * @UseGuards(WsThrottlerGuard)
 * @SubscribeMessage('message')
 * handleMessage() { }
 */
@Injectable()
export class WsThrottlerGuard {
  private readonly logger = new Logger(WsThrottlerGuard.name);
  private readonly requests = new Map<string, number[]>();

  // Configuración
  private readonly limit = 20; // Eventos por ventana
  private readonly ttl = 1000; // Ventana de 1 segundo

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const now = Date.now();

    // Obtener historial de requests del cliente
    const clientId = client.id;
    let timestamps = this.requests.get(clientId) || [];

    // Limpiar timestamps antiguos (fuera de ventana)
    timestamps = timestamps.filter(t => now - t < this.ttl);

    // Verificar límite
    if (timestamps.length >= this.limit) {
      this.logger.warn(`⚠️ Rate limit exceeded for client ${clientId}`);
      throw new WsException('Too many requests. Please slow down.');
    }

    // Registrar timestamp actual
    timestamps.push(now);
    this.requests.set(clientId, timestamps);

    // Limpiar entrada cuando el cliente se desconecta
    client.once('disconnect', () => {
      this.requests.delete(clientId);
    });

    return true;
  }
}
