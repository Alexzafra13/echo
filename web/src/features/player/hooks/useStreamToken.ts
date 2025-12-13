import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useAuthStore } from '@shared/store';
import { useCallback } from 'react';

interface StreamTokenResponse {
  token: string;
  expiresAt: string;
}

/**
 * Hook to get or generate a stream token for audio playback
 * Token is cached and automatically refreshed when expired
 * Only fetches when user is authenticated
 */
export function useStreamToken() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stream-token'],
    queryFn: async (): Promise<StreamTokenResponse> => {
      const response = await apiClient.get('/stream-token');
      return response.data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    retry: 3,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Function to ensure token is available (fetch if not cached)
  const ensureToken = useCallback(async (): Promise<string | null> => {
    // If we already have a token, return it
    if (query.data?.token) {
      return query.data.token;
    }

    // If not authenticated, can't get token
    if (!isAuthenticated) {
      return null;
    }

    // Try to fetch the token (this will use cache if available)
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['stream-token'],
        queryFn: async (): Promise<StreamTokenResponse> => {
          const response = await apiClient.get('/stream-token');
          return response.data;
        },
      });
      return result?.token || null;
    } catch {
      return null;
    }
  }, [query.data?.token, isAuthenticated, queryClient]);

  return {
    ...query,
    ensureToken,
  };
}
