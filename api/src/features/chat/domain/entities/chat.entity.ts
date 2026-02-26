export interface ConversationUser {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface ConversationDto {
  id: string;
  otherUser: ConversationUser;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: Date;
  } | null;
  unreadCount: number;
  createdAt: Date;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}
