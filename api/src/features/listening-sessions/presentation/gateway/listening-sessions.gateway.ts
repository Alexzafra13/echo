import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  UseGuards,
} from '@nestjs/websockets';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '@infrastructure/websocket/guards/ws-jwt.guard';
import { WsExceptionFilter } from '@infrastructure/websocket/filters/ws-exception.filter';
import { WsLoggingInterceptor } from '@infrastructure/websocket/interceptors/ws-logging.interceptor';

/**
 * ListeningSessionsGateway
 *
 * WebSocket gateway for real-time listening session events.
 * Clients join a room named `session:{sessionId}` and receive
 * events like queue updates, track changes, and participant changes.
 *
 * Events emitted to clients:
 * - session:queue-updated - When a track is added to the queue
 * - session:track-changed - When the current track changes (skip)
 * - session:participant-joined - When someone joins
 * - session:participant-left - When someone leaves
 * - session:participant-role-changed - When a role is updated
 * - session:ended - When the session ends
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

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.join(room);

    const userId = client.data.user?.userId || client.data.userId;

    // Notify others in the room
    client.to(room).emit('session:participant-joined', {
      userId,
      sessionId: data.sessionId,
    });

    return { event: 'session:joined', data: { sessionId: data.sessionId } };
  }

  @SubscribeMessage('session:leave')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.leave(room);

    const userId = client.data.user?.userId || client.data.userId;

    client.to(room).emit('session:participant-left', {
      userId,
      sessionId: data.sessionId,
    });

    return { event: 'session:left', data: { sessionId: data.sessionId } };
  }

  handleDisconnect(client: Socket) {
    // Socket.IO automatically removes from all rooms on disconnect
  }

  // Methods called by the controller/use-cases to broadcast events
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
