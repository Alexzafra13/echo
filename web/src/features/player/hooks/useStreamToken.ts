import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useAuthStore } from '@shared/store';
import { useCallback, useRef } from 'react';

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

  // Track in-flight fetch to avoid duplicate requests
  const fetchPromiseRef = useRef<Promise<string | null> | null>(null);

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
    // If we already have a token, return it immediately
    if (query.data?.token) {
      return query.data.token;
    }

    // If not authenticated, can't get token
    if (!isAuthenticated) {
      return null;
    }

    // If there's already a fetch in progress, wait for it
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    // Create a new fetch promise
    fetchPromiseRef.current = (async () => {
      try {
        // Use ensureQueryData which will wait for existing fetches or start a new one
        const result = await queryClient.ensureQueryData({
          queryKey: ['stream-token'],
          queryFn: async (): Promise<StreamTokenResponse> => {
            const response = await apiClient.get('/stream-token');
            return response.data;
          },
        });
        return result?.token || null;
      } catch {
        return null;
      } finally {
        // Clear the in-flight promise
        fetchPromiseRef.current = null;
      }
    })();

    return fetchPromiseRef.current;
  }, [query.data?.token, isAuthenticated, queryClient]);

  return {
    ...query,
    ensureToken,
  };
}
