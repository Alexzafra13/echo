import { apiClient } from '@shared/services/api';

export interface ConversationUser {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Conversation {
  id: string;
  otherUser: ConversationUser;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiClient.get('/chat/conversations');
  return response.data;
}

export async function startConversation(otherUserId: string): Promise<{ conversationId: string }> {
  const response = await apiClient.post('/chat/conversations', { otherUserId });
  return response.data;
}

export async function getMessages(conversationId: string, before?: string): Promise<Message[]> {
  const params = before ? `?before=${encodeURIComponent(before)}` : '';
  const response = await apiClient.get(`/chat/conversations/${conversationId}/messages${params}`);
  return response.data;
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
    content,
  });
  return response.data;
}

export async function markAsRead(conversationId: string): Promise<void> {
  await apiClient.post(`/chat/conversations/${conversationId}/read`);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/chat/conversations/${conversationId}`);
}
