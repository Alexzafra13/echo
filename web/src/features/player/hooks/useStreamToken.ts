import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useAuthStore } from '@shared/store';
import { useCallback } from 'react';

interface StreamTokenResponse {
  token: string;
  expiresAt: string;
}

const STREAM_TOKEN_KEY = ['stream-token'];
const STREAM_TOKEN_STALE_TIME = 1000 * 60 * 60 * 24; // 24h (alineado con expiración backend)

async function fetchStreamToken(): Promise<StreamTokenResponse> {
  const response = await apiClient.get('/stream-token');
  return response.data;
}

export function useStreamToken() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: STREAM_TOKEN_KEY,
    queryFn: fetchStreamToken,
    staleTime: STREAM_TOKEN_STALE_TIME,
    gcTime: STREAM_TOKEN_STALE_TIME,
    retry: 3,
    enabled: isAuthenticated,
  });

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (query.data?.token) {
      return query.data.token;
    }

    if (!isAuthenticated) {
      return null;
    }

    try {
      const data = await queryClient.fetchQuery({
        queryKey: STREAM_TOKEN_KEY,
        queryFn: fetchStreamToken,
        staleTime: STREAM_TOKEN_STALE_TIME,
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
