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
 * Hook to get social overview (main page data)
 * Note: Real-time updates are handled by SSE (useListeningNowSSE hook)
 * Polling is now just a fallback, so intervals can be longer
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
 * Hook to get all friends
 */
export function useFriends() {
  return useQuery<Friend[]>({
    queryKey: socialKeys.friends(),
    queryFn: getFriends,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get pending friend requests
 */
export function usePendingRequests() {
  return useQuery<PendingRequests>({
    queryKey: socialKeys.pendingRequests(),
    queryFn: getPendingRequests,
    staleTime: 30000,
  });
}

/**
 * Hook to get friends who are listening
 * Note: Real-time updates are handled by SSE (useListeningNowSSE hook)
 * Polling is now just a fallback
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
 * Hook to get friends' activity
 */
export function useFriendsActivity(limit?: number) {
  return useQuery<ActivityItem[]>({
    queryKey: socialKeys.activity(limit),
    queryFn: () => getFriendsActivity(limit),
    staleTime: 60000,
  });
}

/**
 * Hook to search users
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
 * Hook to send a friend request
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addresseeId: string) => sendFriendRequest(addresseeId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      queryClient.invalidateQueries({ queryKey: socialKeys.pendingRequests() });
      queryClient.invalidateQueries({ queryKey: socialKeys.friends() });
      // Also invalidate search results to update friendship status
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

/**
 * Hook to accept a friend request
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
 * Hook to remove a friendship
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
