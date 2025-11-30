import {
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WsThrottlerGuard - Rate limiting para eventos WebSocket
 *
 * Responsabilidades:
 * - Limitar número de eventos por segundo por cliente
 * - Prevenir spam y abuse
 * - Liberar memoria de clientes desconectados
 * - Limpieza periódica de entradas obsoletas (cada 10 min)
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
export class WsThrottlerGuard implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WsThrottlerGuard.name);
  private readonly requests = new Map<string, number[]>();
  private readonly trackedClients = new Set<string>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configuración
  private readonly limit = 20; // Eventos por ventana
  private readonly ttl = 1000; // Ventana de 1 segundo
  private readonly cleanupIntervalMs = 10 * 60 * 1000; // 10 minutos

  onModuleInit(): void {
    // Iniciar limpieza periódica cada 10 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, this.cleanupIntervalMs);

    this.logger.log('WsThrottlerGuard inicializado con limpieza periódica');
  }

  onModuleDestroy(): void {
    // Limpiar el intervalo al destruir el módulo
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
    this.trackedClients.clear();
  }

  /**
   * Limpia entradas obsoletas del Map de requests
   * Una entrada es obsoleta si todos sus timestamps son antiguos
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [clientId, timestamps] of this.requests.entries()) {
      // Filtrar timestamps válidos
      const validTimestamps = timestamps.filter(t => now - t < this.ttl);

      if (validTimestamps.length === 0) {
        // No hay timestamps válidos, eliminar entrada
        this.requests.delete(clientId);
        this.trackedClients.delete(clientId);
        cleaned++;
      } else if (validTimestamps.length !== timestamps.length) {
        // Actualizar con solo los timestamps válidos
        this.requests.set(clientId, validTimestamps);
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Limpiadas ${cleaned} entradas obsoletas del cache de throttler`);
    }
  }

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
      this.logger.warn(`⚠️ Límite de rate excedido para cliente ${clientId}`);
      throw new WsException('Demasiadas solicitudes. Por favor, reduce la velocidad.');
    }

    // Registrar timestamp actual
    timestamps.push(now);
    this.requests.set(clientId, timestamps);

    // Solo registrar listener de disconnect una vez por cliente
    if (!this.trackedClients.has(clientId)) {
      this.trackedClients.add(clientId);

      client.once('disconnect', () => {
        this.requests.delete(clientId);
        this.trackedClients.delete(clientId);
      });
    }

    return true;
  }
}
