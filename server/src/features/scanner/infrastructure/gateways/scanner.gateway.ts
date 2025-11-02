import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { WsJwtGuard, WsThrottlerGuard, WsLoggingInterceptor } from '@infrastructure/websocket';
import {
  SubscribeScanDto,
  ScanProgressDto,
  ScanErrorDto,
  ScanCompletedDto,
  PauseScanDto,
  CancelScanDto,
  ResumeScanDto,
} from '../../presentation/dtos/scanner-events.dto';

/**
 * ScannerGateway - Gateway WebSocket para eventos del scanner
 *
 * Responsabilidades:
 * - Emitir progreso de escaneos en tiempo real
 * - Permitir suscripción a scans específicos
 * - Permitir control del scanner (pausar/cancelar/resumir)
 * - Notificar errores durante el escaneo
 *
 * Eventos emitidos (servidor → cliente):
 * - scan:progress    - Progreso del escaneo
 * - scan:error       - Error durante escaneo
 * - scan:completed   - Escaneo completado
 *
 * Eventos recibidos (cliente → servidor):
 * - scanner:subscribe - Suscribirse a un scan
 * - scanner:pause     - Pausar scan
 * - scanner:cancel    - Cancelar scan
 * - scanner:resume    - Resumir scan pausado
 *
 * Seguridad:
 * - Requiere autenticación JWT
 * - Rate limiting aplicado
 * - Solo usuarios admin pueden controlar scans
 *
 * Uso:
 * const socket = io('http://localhost:3000/scanner');
 * socket.emit('scanner:subscribe', { scanId: '123' });
 * socket.on('scan:progress', (data) => console.log(data));
 */
@WebSocketGateway({
  namespace: 'scanner',
  cors: {
    origin: '*', // Configurar según ambiente
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
@UseInterceptors(WsLoggingInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
export class ScannerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ScannerGateway.name);

  /**
   * Inicialización del gateway
   */
  afterInit(server: Server) {
    this.logger.log('🔌 ScannerGateway initialized');
  }

  /**
   * Cliente conectado
   */
  handleConnection(client: Socket) {
    const userId = client.data?.userId || 'anonymous';
    this.logger.log(`✅ Client connected to scanner namespace: ${client.id} (User: ${userId})`);
  }

  /**
   * Cliente desconectado
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected from scanner namespace: ${client.id}`);
  }

  /**
   * Suscribirse a eventos de un scan específico
   */
  @SubscribeMessage('scanner:subscribe')
  @UseGuards(WsThrottlerGuard)
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeScanDto,
  ): Promise<void> {
    const room = `scan:${dto.scanId}`;

    // Unirse al room del scan
    await client.join(room);

    this.logger.debug(`Client ${client.id} subscribed to scan ${dto.scanId}`);

    // Enviar confirmación
    client.emit('scanner:subscribed', {
      scanId: dto.scanId,
      message: 'Successfully subscribed to scan events',
    });
  }

  /**
   * Desuscribirse de eventos de un scan
   */
  @SubscribeMessage('scanner:unsubscribe')
  @UseGuards(WsThrottlerGuard)
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeScanDto,
  ): Promise<void> {
    const room = `scan:${dto.scanId}`;

    // Salir del room
    await client.leave(room);

    this.logger.debug(`Client ${client.id} unsubscribed from scan ${dto.scanId}`);

    // Enviar confirmación
    client.emit('scanner:unsubscribed', {
      scanId: dto.scanId,
      message: 'Successfully unsubscribed from scan events',
    });
  }

  /**
   * Pausar un scan (solo admin)
   */
  @SubscribeMessage('scanner:pause')
  @UseGuards(WsThrottlerGuard)
  async handlePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: PauseScanDto,
  ): Promise<void> {
    // TODO: Verificar que el usuario es admin
    // TODO: Implementar lógica de pausa en ScanProcessorService

    this.logger.log(`User ${client.data.userId} requested to pause scan ${dto.scanId}`);

    client.emit('scanner:paused', {
      scanId: dto.scanId,
      message: 'Scan paused successfully',
    });
  }

  /**
   * Cancelar un scan (solo admin)
   */
  @SubscribeMessage('scanner:cancel')
  @UseGuards(WsThrottlerGuard)
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CancelScanDto,
  ): Promise<void> {
    // TODO: Verificar que el usuario es admin
    // TODO: Implementar lógica de cancelación en ScanProcessorService

    this.logger.log(`User ${client.data.userId} requested to cancel scan ${dto.scanId}`);

    client.emit('scanner:cancelled', {
      scanId: dto.scanId,
      reason: dto.reason,
      message: 'Scan cancelled successfully',
    });
  }

  /**
   * Resumir un scan pausado (solo admin)
   */
  @SubscribeMessage('scanner:resume')
  @UseGuards(WsThrottlerGuard)
  async handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ResumeScanDto,
  ): Promise<void> {
    // TODO: Verificar que el usuario es admin
    // TODO: Implementar lógica de resumir en ScanProcessorService

    this.logger.log(`User ${client.data.userId} requested to resume scan ${dto.scanId}`);

    client.emit('scanner:resumed', {
      scanId: dto.scanId,
      message: 'Scan resumed successfully',
    });
  }

  // ========== Métodos públicos para emitir eventos ==========

  /**
   * Emitir progreso del scan a todos los clientes suscritos
   */
  emitProgress(data: ScanProgressDto): void {
    const room = `scan:${data.scanId}`;
    this.server.to(room).emit('scan:progress', data);
    this.logger.debug(`Emitted progress for scan ${data.scanId}: ${data.progress}%`);
  }

  /**
   * Emitir error del scan
   */
  emitError(data: ScanErrorDto): void {
    const room = `scan:${data.scanId}`;
    this.server.to(room).emit('scan:error', data);
    this.logger.warn(`Emitted error for scan ${data.scanId}: ${data.error}`);
  }

  /**
   * Emitir completado del scan
   */
  emitCompleted(data: ScanCompletedDto): void {
    const room = `scan:${data.scanId}`;

    // Emitir al room específico (para clientes suscritos a este scan)
    this.server.to(room).emit('scan:completed', data);

    // TAMBIÉN emitir a todos los clientes del namespace (para auto-refresh global)
    this.server.emit('scan:completed', data);

    this.logger.log(`Emitted completed for scan ${data.scanId} (to room and broadcast)`);
  }
}
