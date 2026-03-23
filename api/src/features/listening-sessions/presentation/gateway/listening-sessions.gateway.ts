import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '@infrastructure/websocket/guards/ws-jwt.guard';
import { WsExceptionFilter } from '@infrastructure/websocket/filters/ws-exception.filter';
import { WsLoggingInterceptor } from '@infrastructure/websocket/interceptors/ws-logging.interceptor';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../domain/ports/listening-session-repository.port';

/**
 * ListeningSessionsGateway
 *
 * WebSocket gateway para sesiones de escucha compartida.
 * Gestiona la sincronizacion de reproduccion entre host y participantes.
 *
 * Eventos de control (host -> server -> participantes):
 * - session:playback-update: estado periodico (cada 5s)
 * - session:play/pause/seek/track-change: acciones inmediatas del host
 */
@WebSocketGateway({
  namespace: 'listening-sessions',
  cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
@UseFilters(WsExceptionFilter)
@UseInterceptors(WsLoggingInterceptor)
export class ListeningSessionsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // socket -> { sessionId, userId, isHost }
  private socketSessions = new Map<string, { sessionId: string; userId: string; isHost: boolean }>();

  private cleanupService: {
    cancelHostDisconnectTimeout: (sessionId: string) => Promise<void>;
    scheduleHostDisconnectTimeout: (sessionId: string) => Promise<void>;
    resetInactivityTimeout: (sessionId: string) => Promise<void>;
  } | null = null;

  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  setCleanupService(service: typeof this.cleanupService) {
    this.cleanupService = service;
  }

  // ============================================
  // Sesion: join/leave
  // ============================================

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.join(room);

    const userId = client.data.user?.userId || client.data.userId;
    const session = await this.sessionRepository.findById(data.sessionId);
    const isHost = session?.hostId === userId;

    this.socketSessions.set(client.id, {
      sessionId: data.sessionId,
      userId,
      isHost,
    });

    if (isHost && this.cleanupService) {
      await this.cleanupService.cancelHostDisconnectTimeout(data.sessionId);
    }

    if (this.cleanupService) {
      await this.cleanupService.resetInactivityTimeout(data.sessionId);
    }

    client.to(room).emit('session:participant-joined', {
      userId,
      sessionId: data.sessionId,
    });

    return { event: 'session:joined', data: { sessionId: data.sessionId, isHost } };
  }

  @SubscribeMessage('session:leave')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.leave(room);
    this.socketSessions.delete(client.id);

    const userId = client.data.user?.userId || client.data.userId;

    client.to(room).emit('session:participant-left', {
      userId,
      sessionId: data.sessionId,
    });

    return { event: 'session:left', data: { sessionId: data.sessionId } };
  }

  async handleDisconnect(client: Socket) {
    const sessionInfo = this.socketSessions.get(client.id);
    if (!sessionInfo) return;

    this.socketSessions.delete(client.id);

    if (sessionInfo.isHost && this.cleanupService) {
      await this.cleanupService.scheduleHostDisconnectTimeout(sessionInfo.sessionId);
    }
  }

  // ============================================
  // Sincronizacion de reproduccion (host -> participantes)
  // ============================================

  @SubscribeMessage('session:playback-update')
  handlePlaybackUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackId: string; position: number; isPlaying: boolean },
  ) {
    const info = this.socketSessions.get(client.id);
    if (!info?.isHost) return; // Solo el host puede emitir

    client.to(`session:${info.sessionId}`).emit('session:sync', {
      trackId: data.trackId,
      position: data.position,
      isPlaying: data.isPlaying,
    });
  }

  @SubscribeMessage('session:play')
  handlePlay(@ConnectedSocket() client: Socket) {
    const info = this.socketSessions.get(client.id);
    if (!info?.isHost) return;

    client.to(`session:${info.sessionId}`).emit('session:host-play', {});
  }

  @SubscribeMessage('session:pause')
  handlePause(@ConnectedSocket() client: Socket) {
    const info = this.socketSessions.get(client.id);
    if (!info?.isHost) return;

    client.to(`session:${info.sessionId}`).emit('session:host-pause', {});
  }

  @SubscribeMessage('session:seek')
  handleSeek(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { position: number },
  ) {
    const info = this.socketSessions.get(client.id);
    if (!info?.isHost) return;

    client.to(`session:${info.sessionId}`).emit('session:host-seek', {
      position: data.position,
    });
  }

  @SubscribeMessage('session:track-change')
  handleTrackChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackId: string; trackData: Record<string, unknown> },
  ) {
    const info = this.socketSessions.get(client.id);
    if (!info?.isHost) return;

    client.to(`session:${info.sessionId}`).emit('session:host-track-change', {
      trackId: data.trackId,
      trackData: data.trackData,
    });
  }

  // ============================================
  // Broadcasts desde controllers/use-cases
  // ============================================

  notifyQueueUpdated(sessionId: string, data: Record<string, unknown>) {
    this.server.to(`session:${sessionId}`).emit('session:queue-updated', data);
  }

  notifyTrackChanged(sessionId: string, data: Record<string, unknown>) {
    this.server.to(`session:${sessionId}`).emit('session:track-changed', data);
  }

  notifyParticipantRoleChanged(sessionId: string, data: Record<string, unknown>) {
    this.server.to(`session:${sessionId}`).emit('session:participant-role-changed', data);
  }

  notifySessionEnded(sessionId: string) {
    this.server.to(`session:${sessionId}`).emit('session:ended', { sessionId });
  }
}
