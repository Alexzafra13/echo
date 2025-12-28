import {
  ExecutionContext,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Socket } from 'socket.io';

/**
 * Estado de rate limiting por cliente
 * Usa Fixed Window Counter - más eficiente que almacenar timestamps
 */
interface ClientRateState {
  count: number; // Número de requests en la ventana actual
  windowStart: number; // Inicio de la ventana actual (timestamp)
}

/**
 * WsThrottlerGuard - Rate limiting para eventos WebSocket
 *
 * Algoritmo: Fixed Window Counter
 * - Más eficiente en memoria: O(1) por cliente vs O(limit) con timestamps
 * - Divide el tiempo en ventanas fijas
 * - Cuenta requests por ventana
 *
 * Configuración por defecto:
 * - 20 eventos por ventana por cliente
 * - Ventana de tiempo: 1 segundo
 *
 * Uso:
 * @UseGuards(WsThrottlerGuard)
 * @SubscribeMessage('message')
 * handleMessage() { }
 */
@Injectable()
export class WsThrottlerGuard implements OnModuleInit, OnModuleDestroy {
  private readonly clients = new Map<string, ClientRateState>();
  private readonly trackedClients = new Set<string>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configuración
  private readonly limit = 20; // Eventos por ventana
  private readonly windowMs = 1000; // Ventana de 1 segundo
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // Limpieza cada 5 minutos

  constructor(
    @InjectPinoLogger(WsThrottlerGuard.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, this.cleanupIntervalMs);

    this.logger.info('WsThrottlerGuard inicializado con Fixed Window Counter');
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clients.clear();
    this.trackedClients.clear();
  }

  /**
   * Limpia entradas de clientes inactivos
   * Una entrada es obsoleta si su ventana expiró hace más de 1 minuto
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    const staleThreshold = 60_000; // 1 minuto de inactividad
    let cleaned = 0;

    for (const [clientId, state] of this.clients.entries()) {
      if (now - state.windowStart > staleThreshold) {
        this.clients.delete(clientId);
        this.trackedClients.delete(clientId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Limpiadas ${cleaned} entradas inactivas del throttler`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const clientId = client.id;
    const now = Date.now();

    let state = this.clients.get(clientId);

    // Si no existe o la ventana expiró, crear nueva ventana
    if (!state || now - state.windowStart >= this.windowMs) {
      state = { count: 0, windowStart: now };
    }

    // Verificar límite
    if (state.count >= this.limit) {
      this.logger.warn(`⚠️ Límite de rate excedido para cliente ${clientId}`);
      throw new WsException('Demasiadas solicitudes. Por favor, reduce la velocidad.');
    }

    // Incrementar contador
    state.count++;
    this.clients.set(clientId, state);

    // Registrar listener de disconnect solo una vez
    if (!this.trackedClients.has(clientId)) {
      this.trackedClients.add(clientId);

      client.once('disconnect', () => {
        this.clients.delete(clientId);
        this.trackedClients.delete(clientId);
      });
    }

    return true;
  }
}
