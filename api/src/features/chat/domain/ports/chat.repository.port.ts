import { ConversationDto, MessageDto } from '../entities/chat.entity';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface IChatRepository {
  getOrCreateConversation(userId: string, otherUserId: string): Promise<string>;
  getConversations(userId: string): Promise<ConversationDto[]>;
  getMessages(
    conversationId: string,
    userId: string,
    limit?: number,
    before?: string
  ): Promise<MessageDto[]>;
  sendMessage(conversationId: string, senderId: string, content: string): Promise<MessageDto>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  isParticipant(conversationId: string, userId: string): Promise<boolean>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
}
