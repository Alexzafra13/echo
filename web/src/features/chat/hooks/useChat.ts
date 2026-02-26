import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as chatService from '../services/chat.service';

const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  messages: (id: string) => [...chatKeys.all, 'messages', id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: chatService.getConversations,
    staleTime: 30_000,
    refetchInterval: 15_000,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId || ''),
    queryFn: () => chatService.getMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 10_000,
    refetchInterval: 5_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      chatService.sendMessage(conversationId, content),
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(msg.conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) => chatService.startConversation(otherUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatService.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatService.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}
