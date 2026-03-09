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
import { UseGuards, UseInterceptors, UsePipes, ValidationPipe, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { WsJwtGuard, WsThrottlerGuard, WsLoggingInterceptor } from '@infrastructure/websocket';
import { IScanControl, SCAN_CONTROL } from '../../domain/ports/scan-control.port';
import {
  SubscribeScanDto,
  ScanProgressDto,
  ScanErrorDto,
  ScanCompletedDto,
  PauseScanDto,
  CancelScanDto,
  ResumeScanDto,
  LufsProgressDto,
  DjProgressDto,
  LibraryChangeDto,
} from '../../presentation/dtos/scanner-events.dto';

@WebSocketGateway({
  namespace: 'scanner',
  // CORS is configured globally by WebSocketAdapter (see websocket.adapter.ts)
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
@UseInterceptors(WsLoggingInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
export class ScannerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectPinoLogger(ScannerGateway.name)
    private readonly logger: PinoLogger,
    @Inject(SCAN_CONTROL)
    private readonly scanProcessor: IScanControl
  ) {}

  @WebSocketServer()
  server!: Server;
  // Caché de progreso para suscriptores tardíos
  private scanProgress = new Map<string, ScanProgressDto>();

  afterInit(server: Server) {
    this.logger.info('🔌 ScannerGateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.data?.userId || 'anonymous';
    this.logger.info(`✅ Client connected to scanner namespace: ${client.id} (User: ${userId})`);

    if (this.lufsProgress) {
      client.emit('lufs:progress', this.lufsProgress);
    }

    if (this.djProgress) {
      client.emit('dj:progress', this.djProgress);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.info(`❌ Client disconnected from scanner namespace: ${client.id}`);
  }

  @SubscribeMessage('scanner:subscribe')
  @UseGuards(WsThrottlerGuard)
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeScanDto
  ): Promise<void> {
    const room = `scan:${dto.scanId}`;

    await client.join(room);

    this.logger.debug(`Client ${client.id} subscribed to scan ${dto.scanId}`);

    client.emit('scanner:subscribed', {
      scanId: dto.scanId,
      message: 'Successfully subscribed to scan events',
    });

    const currentProgress = this.scanProgress.get(dto.scanId);
    if (currentProgress) {
      client.emit('scan:progress', currentProgress);
      this.logger.debug(`Sent current progress to late subscriber for scan ${dto.scanId}`);
    }
  }

  @SubscribeMessage('scanner:unsubscribe')
  @UseGuards(WsThrottlerGuard)
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeScanDto
  ): Promise<void> {
    const room = `scan:${dto.scanId}`;

    await client.leave(room);

    this.logger.debug(`Client ${client.id} unsubscribed from scan ${dto.scanId}`);

    client.emit('scanner:unsubscribed', {
      scanId: dto.scanId,
      message: 'Successfully unsubscribed from scan events',
    });
  }

  @SubscribeMessage('scanner:pause')
  @UseGuards(WsThrottlerGuard)
  async handlePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: PauseScanDto
  ): Promise<void> {
    if (!client.data.user?.isAdmin) {
      throw new WsException('Unauthorized: Admin access required');
    }

    const success = await this.scanProcessor.pauseScan(dto.scanId);
    if (!success) {
      throw new WsException('No se puede pausar: el scan no está en ejecución');
    }

    this.logger.info(`Admin ${client.data.userId} paused scan ${dto.scanId}`);

    client.emit('scanner:paused', {
      scanId: dto.scanId,
      message: 'Scan paused successfully',
    });
  }

  @SubscribeMessage('scanner:cancel')
  @UseGuards(WsThrottlerGuard)
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CancelScanDto
  ): Promise<void> {
    if (!client.data.user?.isAdmin) {
      throw new WsException('Unauthorized: Admin access required');
    }

    const success = await this.scanProcessor.cancelScan(dto.scanId, dto.reason);
    if (!success) {
      throw new WsException('No se puede cancelar: el scan no está en ejecución ni en pausa');
    }

    this.logger.info(`Admin ${client.data.userId} cancelled scan ${dto.scanId}`);

    client.emit('scanner:cancelled', {
      scanId: dto.scanId,
      reason: dto.reason,
      message: 'Scan cancelled successfully',
    });
  }

  @SubscribeMessage('scanner:resume')
  @UseGuards(WsThrottlerGuard)
  async handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ResumeScanDto
  ): Promise<void> {
    if (!client.data.user?.isAdmin) {
      throw new WsException('Unauthorized: Admin access required');
    }

    const success = await this.scanProcessor.resumeScan(dto.scanId);
    if (!success) {
      throw new WsException('No se puede reanudar: el scan no está en pausa');
    }

    this.logger.info(`Admin ${client.data.userId} resumed scan ${dto.scanId}`);

    client.emit('scanner:resumed', {
      scanId: dto.scanId,
      message: 'Scan resumed successfully',
    });
  }

  private lufsProgress: LufsProgressDto | null = null;
  private djProgress: DjProgressDto | null = null;

  emitProgress(data: ScanProgressDto): void {
    const room = `scan:${data.scanId}`;

    this.scanProgress.set(data.scanId, data);
    this.server.to(room).emit('scan:progress', data);
    // Broadcast global para mitigar race conditions de suscripción
    this.server.emit('scan:progress', data);

    this.logger.debug(`Emitted progress for scan ${data.scanId}: ${data.progress}%`);
  }

  emitError(data: ScanErrorDto): void {
    const room = `scan:${data.scanId}`;

    this.server.to(room).emit('scan:error', data);
    this.server.emit('scan:error', data);

    this.logger.warn(`Emitted error for scan ${data.scanId}: ${data.error}`);
  }

  emitCompleted(data: ScanCompletedDto): void {
    const room = `scan:${data.scanId}`;

    this.scanProgress.delete(data.scanId);
    this.server.to(room).emit('scan:completed', data);
    this.server.emit('scan:completed', data);

    this.logger.info(`Emitted completed for scan ${data.scanId} (to room and broadcast)`);
  }

  emitLufsProgress(data: LufsProgressDto): void {
    this.lufsProgress = data.isRunning ? data : null;
    this.server.emit('lufs:progress', data);

    this.logger.debug(
      `Emitted LUFS progress: ${data.processedInSession}/${data.processedInSession + data.pendingTracks} tracks`
    );
  }

  getCurrentLufsProgress(): LufsProgressDto | null {
    return this.lufsProgress;
  }

  emitDjProgress(data: DjProgressDto): void {
    this.djProgress = data.isRunning ? data : null;
    this.server.emit('dj:progress', data);

    this.logger.debug(
      `Emitted DJ progress: ${data.processedInSession}/${data.processedInSession + data.pendingTracks} tracks`
    );
  }

  getCurrentDjProgress(): DjProgressDto | null {
    return this.djProgress;
  }

  getCurrentProgress(scanId: string): ScanProgressDto | null {
    return this.scanProgress.get(scanId) ?? null;
  }

  emitLibraryChange(data: LibraryChangeDto): void {
    this.server.emit('library:change', data);
    this.logger.info(
      `📢 Library change: ${data.type} - ${data.trackTitle || data.trackId || 'unknown'}`
    );
  }
}
