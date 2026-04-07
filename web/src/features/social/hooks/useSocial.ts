import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSocialOverview,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getPendingRequests,
  getListeningFriends,
  getFriendsActivity,
  searchUsers,
  SocialOverview,
  Friend,
  PendingRequests,
  ListeningUser,
  ActivityItem,
  SearchUserResult,
} from '../services/social.service';

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  overview: () => [...socialKeys.all, 'overview'] as const,
  friends: () => [...socialKeys.all, 'friends'] as const,
  pendingRequests: () => [...socialKeys.all, 'pending'] as const,
  listening: () => [...socialKeys.all, 'listening'] as const,
  activity: (limit?: number) => [...socialKeys.all, 'activity', limit] as const,
  search: (query: string) => [...socialKeys.all, 'search', query] as const,
};

/**
 * Hook para obtener el resumen social (datos de la página principal).
 * Las actualizaciones en tiempo real las maneja SSE (useListeningNowSSE).
 * El polling es solo un fallback, así que los intervalos pueden ser mayores.
 */
export function useSocialOverview() {
  return useQuery<SocialOverview>({
    queryKey: socialKeys.overview(),
    queryFn: getSocialOverview,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Fallback polling every 60 seconds (SSE handles real-time)
  });
}

/**
 * Hook para obtener todos los amigos
 */
export function useFriends() {
  return useQuery<Friend[]>({
    queryKey: socialKeys.friends(),
    queryFn: getFriends,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook para obtener solicitudes de amistad pendientes
 */
export function usePendingRequests() {
  return useQuery<PendingRequests>({
    queryKey: socialKeys.pendingRequests(),
    queryFn: getPendingRequests,
    staleTime: 30000,
  });
}

/**
 * Hook para obtener amigos que están escuchando.
 * Las actualizaciones en tiempo real las maneja SSE (useListeningNowSSE).
 * El polling es solo un fallback.
 */
export function useListeningFriends() {
  return useQuery<ListeningUser[]>({
    queryKey: socialKeys.listening(),
    queryFn: getListeningFriends,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Fallback polling every 60 seconds (SSE handles real-time)
  });
}

/**
 * Hook para obtener la actividad de los amigos
 */
export function useFriendsActivity(limit?: number) {
  return useQuery<ActivityItem[]>({
    queryKey: socialKeys.activity(limit),
    queryFn: () => getFriendsActivity(limit),
    staleTime: 60000,
  });
}

/**
 * Hook para buscar usuarios
 */
export function useSearchUsers(query: string, enabled = true) {
  return useQuery<SearchUserResult[]>({
    queryKey: socialKeys.search(query),
    queryFn: () => searchUsers(query),
    enabled: enabled && query.length >= 2,
    staleTime: 30000,
  });
}

/**
 * Hook para enviar solicitud de amistad
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addresseeId: string) => sendFriendRequest(addresseeId),
    onSuccess: () => {
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      queryClient.invalidateQueries({ queryKey: socialKeys.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: socialKeys.friends() });
      // También invalidar resultados de búsqueda para actualizar estado de amistad
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

/**
 * Hook para aceptar solicitud de amistad
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) => acceptFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      queryClient.invalidateQueries({ queryKey: socialKeys.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: socialKeys.friends() });
    },
  });
}

/**
 * Hook para eliminar una amistad
 */
export function useRemoveFriendship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) => removeFriendship(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      queryClient.invalidateQueries({ queryKey: socialKeys.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: socialKeys.friends() });
    },
  });
}
