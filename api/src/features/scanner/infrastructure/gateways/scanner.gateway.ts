import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException,
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
  LufsProgressDto,
  LibraryChangeDto,
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
    origin: '*', // Configured in WebSocketAdapter based on CORS_ORIGINS env var
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
@UseInterceptors(WsLoggingInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
export class ScannerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ScannerGateway.name);

  // Store latest progress for each active scan (for late subscribers)
  private scanProgress = new Map<string, ScanProgressDto>();

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

    // Send current LUFS progress if there's an active analysis
    if (this.lufsProgress) {
      client.emit('lufs:progress', this.lufsProgress);
    }
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

    // Si hay progreso guardado para este scan, enviarlo inmediatamente
    // Esto ayuda a clientes que se suscriben tarde (race condition)
    const currentProgress = this.scanProgress.get(dto.scanId);
    if (currentProgress) {
      client.emit('scan:progress', currentProgress);
      this.logger.debug(`Sent current progress to late subscriber for scan ${dto.scanId}`);
    }
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
    // SEGURIDAD: Verificar que el usuario es admin
    if (!client.data.user?.isAdmin) {
      throw new WsException('Unauthorized: Admin access required');
    }

    // TODO: Implementar lógica de pausa en ScanProcessorService

    this.logger.log(`Admin ${client.data.userId} requested to pause scan ${dto.scanId}`);

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
    // SEGURIDAD: Verificar que el usuario es admin
    if (!client.data.user?.isAdmin) {
      throw new WsException('Unauthorized: Admin access required');
    }

    // TODO: Implementar lógica de cancelación en ScanProcessorService

    this.logger.log(`Admin ${client.data.userId} requested to cancel scan ${dto.scanId}`);

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
    // SEGURIDAD: Verificar que el usuario es admin
    if (!client.data.user?.isAdmin) {
      throw new WsException('Unauthorized: Admin access required');
    }

    // TODO: Implementar lógica de resumir en ScanProcessorService

    this.logger.log(`Admin ${client.data.userId} requested to resume scan ${dto.scanId}`);

    client.emit('scanner:resumed', {
      scanId: dto.scanId,
      message: 'Scan resumed successfully',
    });
  }

  // Store latest LUFS progress for late subscribers
  private lufsProgress: LufsProgressDto | null = null;

  // ========== Métodos públicos para emitir eventos ==========

  /**
   * Emitir progreso del scan a todos los clientes suscritos
   */
  emitProgress(data: ScanProgressDto): void {
    const room = `scan:${data.scanId}`;

    // Store latest progress for late subscribers
    this.scanProgress.set(data.scanId, data);

    // Emit to specific room (for subscribed clients)
    this.server.to(room).emit('scan:progress', data);

    // ALSO emit broadcast to all clients (for race condition mitigation)
    this.server.emit('scan:progress', data);

    this.logger.debug(`Emitted progress for scan ${data.scanId}: ${data.progress}%`);
  }

  /**
   * Emitir error del scan
   */
  emitError(data: ScanErrorDto): void {
    const room = `scan:${data.scanId}`;

    // Emit to specific room (for subscribed clients)
    this.server.to(room).emit('scan:error', data);

    // ALSO emit broadcast to all clients
    this.server.emit('scan:error', data);

    this.logger.warn(`Emitted error for scan ${data.scanId}: ${data.error}`);
  }

  /**
   * Emitir completado del scan
   */
  emitCompleted(data: ScanCompletedDto): void {
    const room = `scan:${data.scanId}`;

    // Clean up stored progress for this scan
    this.scanProgress.delete(data.scanId);

    // Emitir al room específico (para clientes suscritos a este scan)
    this.server.to(room).emit('scan:completed', data);

    // TAMBIÉN emitir a todos los clientes del namespace (para auto-refresh global)
    this.server.emit('scan:completed', data);

    this.logger.log(`Emitted completed for scan ${data.scanId} (to room and broadcast)`);
  }

  /**
   * Emitir progreso del análisis LUFS a todos los clientes
   */
  emitLufsProgress(data: LufsProgressDto): void {
    // Store latest progress for late subscribers
    this.lufsProgress = data.isRunning ? data : null;

    // Broadcast to all clients
    this.server.emit('lufs:progress', data);

    this.logger.debug(
      `Emitted LUFS progress: ${data.processedInSession}/${data.processedInSession + data.pendingTracks} tracks`
    );
  }

  /**
   * Obtener el estado actual de LUFS para nuevos suscriptores
   */
  getCurrentLufsProgress(): LufsProgressDto | null {
    return this.lufsProgress;
  }

  /**
   * Emitir cambio en la biblioteca (track/album/artist añadido o eliminado)
   * Usado por el file watcher para notificar cambios en tiempo real
   */
  emitLibraryChange(data: LibraryChangeDto): void {
    // Broadcast to all connected clients
    this.server.emit('library:change', data);
    this.logger.log(`📢 Library change: ${data.type} - ${data.trackTitle || data.trackId || 'unknown'}`);
  }
}
