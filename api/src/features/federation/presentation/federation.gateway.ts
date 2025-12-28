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
import { UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { WsJwtGuard, WsThrottlerGuard, WsLoggingInterceptor } from '@infrastructure/websocket';
import { IsString } from 'class-validator';
import { AlbumImportProgressEvent } from '../infrastructure/services/album-import.service';

/**
 * DTO for subscribing to import progress
 */
class SubscribeImportDto {
  @IsString()
  importId!: string;
}

/**
 * FederationGateway - Gateway WebSocket para eventos de federación
 *
 * Responsabilidades:
 * - Emitir progreso de importaciones de álbumes en tiempo real
 * - Permitir suscripción a importaciones específicas
 *
 * Eventos emitidos (servidor → cliente):
 * - import:progress  - Progreso de importación
 * - import:completed - Importación completada
 * - import:failed    - Importación fallida
 *
 * Eventos recibidos (cliente → servidor):
 * - federation:subscribe   - Suscribirse a una importación
 * - federation:unsubscribe - Desuscribirse de una importación
 *
 * Uso:
 * const socket = io('http://localhost:3000/federation');
 * socket.emit('federation:subscribe', { importId: '123' });
 * socket.on('import:progress', (data) => console.log(data));
 */
@WebSocketGateway({
  namespace: 'federation',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
@UseInterceptors(WsLoggingInterceptor)
@UsePipes(new ValidationPipe({ transform: true }))
export class FederationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectPinoLogger(FederationGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  @WebSocketServer()
  server!: Server;
  // Store latest progress for each active import (for late subscribers)
  private importProgress = new Map<string, AlbumImportProgressEvent>();

  // Track user subscriptions for targeted delivery
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  afterInit(server: Server) {
    this.logger.info('FederationGateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
    }
    this.logger.info(`Client connected to federation namespace: ${client.id} (User: ${userId || 'anonymous'})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.info(`Client disconnected from federation namespace: ${client.id}`);
  }

  /**
   * Subscribe to events for a specific import
   */
  @SubscribeMessage('federation:subscribe')
  @UseGuards(WsThrottlerGuard)
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeImportDto,
  ): Promise<void> {
    const room = `import:${dto.importId}`;
    await client.join(room);

    this.logger.debug(`Client ${client.id} subscribed to import ${dto.importId}`);

    client.emit('federation:subscribed', {
      importId: dto.importId,
      message: 'Successfully subscribed to import events',
    });

    // Send current progress if available
    const currentProgress = this.importProgress.get(dto.importId);
    if (currentProgress) {
      client.emit('import:progress', currentProgress);
    }
  }

  /**
   * Unsubscribe from events for a specific import
   */
  @SubscribeMessage('federation:unsubscribe')
  @UseGuards(WsThrottlerGuard)
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubscribeImportDto,
  ): Promise<void> {
    const room = `import:${dto.importId}`;
    await client.leave(room);

    this.logger.debug(`Client ${client.id} unsubscribed from import ${dto.importId}`);

    client.emit('federation:unsubscribed', {
      importId: dto.importId,
      message: 'Successfully unsubscribed from import events',
    });
  }

  /**
   * Handle import progress events (called from AlbumImportService)
   */
  private handleImportProgress(event: AlbumImportProgressEvent): void {
    const room = `import:${event.importId}`;

    // Store progress for late subscribers
    if (event.status === 'downloading') {
      this.importProgress.set(event.importId, event);
    } else {
      // Clean up on completion/failure
      this.importProgress.delete(event.importId);
    }

    // Emit to specific import room
    this.server.to(room).emit('import:progress', event);

    // Also emit to user's sockets (in case they haven't subscribed yet)
    const userSocketIds = this.userSockets.get(event.userId);
    if (userSocketIds) {
      for (const socketId of userSocketIds) {
        this.server.to(socketId).emit('import:progress', event);
      }
    }

    this.logger.debug(
      `Emitted import progress for ${event.importId}: ${event.progress}% (${event.status})`,
    );
  }

  // ========== Public methods for emitting events ==========

  /**
   * Emit import progress to subscribed clients
   */
  emitProgress(data: AlbumImportProgressEvent): void {
    this.handleImportProgress(data);
  }
}
