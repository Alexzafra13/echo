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

  /**
   * Ensures the stream token is available, waiting for it if necessary
   * Returns the token or null if it fails to load
   */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    // If we already have data, return it
    if (query.data?.token) {
      return query.data.token;
    }

    // If not authenticated, can't get token
    if (!isAuthenticated) {
      return null;
    }

    // Try to fetch/wait for the token
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['stream-token'],
        queryFn: async (): Promise<StreamTokenResponse> => {
          const response = await apiClient.get('/stream-token');
          return response.data;
        },
        staleTime: 1000 * 60 * 60 * 24,
      });
      return data.token;
    } catch {
      return null;
    }
  }, [query.data?.token, isAuthenticated, queryClient]);

  return {
    ...query,
    ensureToken,
    isTokenReady: !!query.data?.token,
  };
}
