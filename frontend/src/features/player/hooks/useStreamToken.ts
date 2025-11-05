import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useAuthStore } from '@shared/store';

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

  return useQuery({
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
}
