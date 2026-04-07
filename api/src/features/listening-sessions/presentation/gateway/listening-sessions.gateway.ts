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
import { WsThrottlerGuard } from '@infrastructure/websocket/guards/ws-throttler.guard';
import { WsExceptionFilter } from '@infrastructure/websocket/filters/ws-exception.filter';
import { WsLoggingInterceptor } from '@infrastructure/websocket/interceptors/ws-logging.interceptor';
import {
  IListeningSessionRepository,
  LISTENING_SESSION_REPOSITORY,
} from '../../domain/ports/listening-session-repository.port';

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
})
@UseGuards(WsJwtGuard)
@UseFilters(WsExceptionFilter)
@UseInterceptors(WsLoggingInterceptor)
export class ListeningSessionsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // socket -> datos de sesión para control de acceso y cleanup
  private socketSessions = new Map<
    string,
    {
      sessionId: string;
      userId: string;
      role: 'host' | 'dj' | 'listener';
      guestsCanControl: boolean;
    }
  >();

  private cleanupService: {
    cancelHostDisconnectTimeout: (sessionId: string) => Promise<void>;
    scheduleHostDisconnectTimeout: (sessionId: string) => Promise<void>;
    resetInactivityTimeout: (sessionId: string) => Promise<void>;
  } | null = null;

  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository
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
    @MessageBody() data: { sessionId: string }
  ) {
    try {
      const room = `session:${data.sessionId}`;
      client.join(room);

      const userId = client.data.user?.userId || client.data.userId;
      const session = await this.sessionRepository.findById(data.sessionId);

      // Obtener rol real del participante (host/dj/listener)
      let role: 'host' | 'dj' | 'listener' = 'listener';
      if (session?.hostId === userId) {
        role = 'host';
      } else {
        const participant = await this.sessionRepository.getParticipant(data.sessionId, userId);
        if (participant) {
          role = participant.role as 'host' | 'dj' | 'listener';
        }
      }

      this.socketSessions.set(client.id, {
        sessionId: data.sessionId,
        userId,
        role,
        guestsCanControl: session?.guestsCanControl ?? false,
      });

      if (role === 'host' && this.cleanupService) {
        await this.cleanupService.cancelHostDisconnectTimeout(data.sessionId);
      }

      if (this.cleanupService) {
        await this.cleanupService.resetInactivityTimeout(data.sessionId);
      }

      client.to(room).emit('session:participant-joined', {
        userId,
        sessionId: data.sessionId,
      });

      return {
        event: 'session:joined',
        data: { sessionId: data.sessionId, role, isHost: role === 'host' },
      };
    } catch (error) {
      return { event: 'session:error', data: { message: 'Failed to join session' } };
    }
  }

  @SubscribeMessage('session:leave')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
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

    if (sessionInfo.role === 'host' && this.cleanupService) {
      await this.cleanupService.scheduleHostDisconnectTimeout(sessionInfo.sessionId);
    }
  }

  // ============================================
  // Sincronizacion de reproduccion (host -> participantes)
  // ============================================

  @SubscribeMessage('session:playback-update')
  @UseGuards(WsThrottlerGuard)
  handlePlaybackUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackId: string; position: number; isPlaying: boolean }
  ) {
    if (!this.canControl(client)) return;

    const info = this.socketSessions.get(client.id)!;
    client.to(`session:${info.sessionId}`).emit('session:sync', {
      trackId: data.trackId,
      position: data.position,
      isPlaying: data.isPlaying,
    });
  }

  @SubscribeMessage('session:play')
  @UseGuards(WsThrottlerGuard)
  handlePlay(@ConnectedSocket() client: Socket) {
    if (!this.canControl(client)) return;

    const info = this.socketSessions.get(client.id)!;
    client.to(`session:${info.sessionId}`).emit('session:host-play', {});
  }

  @SubscribeMessage('session:pause')
  @UseGuards(WsThrottlerGuard)
  handlePause(@ConnectedSocket() client: Socket) {
    if (!this.canControl(client)) return;

    const info = this.socketSessions.get(client.id)!;
    client.to(`session:${info.sessionId}`).emit('session:host-pause', {});
  }

  @SubscribeMessage('session:seek')
  @UseGuards(WsThrottlerGuard)
  handleSeek(@ConnectedSocket() client: Socket, @MessageBody() data: { position: number }) {
    if (!this.canControl(client)) return;

    const info = this.socketSessions.get(client.id)!;
    client.to(`session:${info.sessionId}`).emit('session:host-seek', {
      position: data.position,
    });
  }

  @SubscribeMessage('session:track-change')
  @UseGuards(WsThrottlerGuard)
  handleTrackChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackId: string; trackData: Record<string, unknown> }
  ) {
    if (!this.canControl(client)) return;

    const info = this.socketSessions.get(client.id)!;
    client.to(`session:${info.sessionId}`).emit('session:host-track-change', {
      trackId: data.trackId,
      trackData: data.trackData,
    });
  }

  // Participante pide estado actual al host (reconexion / recarga)
  @SubscribeMessage('session:request-state')
  handleRequestState(@ConnectedSocket() client: Socket) {
    const info = this.socketSessions.get(client.id);
    if (!info) return;

    // Reenviar al host de la sesion para que responda
    client.to(`session:${info.sessionId}`).emit('session:state-requested', {
      requesterId: info.userId,
    });
  }

  // Host responde con su estado actual
  @SubscribeMessage('session:state-response')
  handleStateResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      trackId: string;
      position: number;
      isPlaying: boolean;
      trackData?: Record<string, unknown>;
      queue?: unknown[];
    }
  ) {
    const info = this.socketSessions.get(client.id);
    if (info?.role !== 'host') return;

    // Broadcast a todos los participantes de la sesion
    client.to(`session:${info.sessionId}`).emit('session:full-state', data);
  }

  // ============================================
  // Broadcasts desde controllers/use-cases
  // ============================================

  /**
   * Actualiza guestsCanControl en todos los sockets de una sesión.
   * Llamar cuando el host cambia el setting para que canControl()
   * refleje el nuevo estado sin que los participantes reconecten.
   */
  updateSessionSetting(sessionId: string, guestsCanControl: boolean) {
    for (const [socketId, info] of this.socketSessions.entries()) {
      if (info.sessionId === sessionId) {
        this.socketSessions.set(socketId, { ...info, guestsCanControl });
      }
    }
  }

  /**
   * Actualiza el rol de un participante en socketSessions.
   * Llamar cuando el host cambia el rol (dj/listener) para que
   * canControl() refleje el nuevo permiso inmediatamente.
   */
  updateParticipantRole(sessionId: string, userId: string, newRole: 'dj' | 'listener') {
    for (const [socketId, info] of this.socketSessions.entries()) {
      if (info.sessionId === sessionId && info.userId === userId) {
        this.socketSessions.set(socketId, { ...info, role: newRole });
      }
    }
  }

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

  // ============================================
  // Helpers
  // ============================================

  private canControl(client: Socket): boolean {
    const info = this.socketSessions.get(client.id);
    if (!info) return false;
    // host y dj siempre pueden controlar; listeners solo si guestsCanControl está activo
    return info.role === 'host' || info.role === 'dj' || info.guestsCanControl;
  }
}
