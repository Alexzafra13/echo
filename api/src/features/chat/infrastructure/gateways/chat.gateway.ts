import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { WsJwtGuard } from '@infrastructure/websocket';
import { CHAT_REPOSITORY, IChatRepository } from '../../domain/ports';

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    username?: string;
  };
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectPinoLogger(ChatGateway.name)
    private readonly logger: PinoLogger,
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepo: IChatRepository
  ) {}

  @WebSocketServer()
  server!: Server;

  // Map userId -> Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: AuthenticatedSocket) {
    const userId = client.data?.userId;
    if (!userId) return;

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.debug({ userId, socketId: client.id }, 'Chat client connected');
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.debug({ userId, socketId: client.id }, 'Chat client disconnected');
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string }
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    const isParticipant = await this.chatRepo.isParticipant(data.conversationId, userId);
    if (!isParticipant) return;

    const message = await this.chatRepo.sendMessage(data.conversationId, userId, data.content);

    // Emit to all participants in the conversation
    // We need to find the other user - get conversations to find who else is in it
    this.emitToConversation(data.conversationId, 'chat:message', message);

    return message;
  }

  @SubscribeMessage('chat:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    await this.chatRepo.markAsRead(data.conversationId, userId);

    // Notify other user that messages were read
    this.emitToConversation(data.conversationId, 'chat:read', {
      conversationId: data.conversationId,
      readBy: userId,
    });
  }

  @SubscribeMessage('chat:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    const isParticipant = await this.chatRepo.isParticipant(data.conversationId, userId);
    if (!isParticipant) return;

    // Join the Socket.IO room for this conversation
    await client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    await client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    // Broadcast to conversation room, excluding the sender
    client.to(`conversation:${data.conversationId}`).emit('chat:typing', {
      conversationId: data.conversationId,
      userId,
    });
  }

  private emitToConversation(conversationId: string, event: string, data: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }
}
