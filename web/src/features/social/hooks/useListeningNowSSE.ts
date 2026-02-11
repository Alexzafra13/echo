import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { useSSE } from '@shared/hooks';
import { logger } from '@shared/utils/logger';
import { socialKeys } from './useSocial';

export interface ListeningUpdate {
  userId: string;
  isPlaying: boolean;
  currentTrackId: string | null;
  timestamp: string;
}

/**
 * Hook for real-time "listening now" updates via Server-Sent Events
 *
 * When a friend starts/stops playing music, this hook receives the update
 * instantly and invalidates the relevant React Query caches to trigger
 * a refetch of the listening friends data.
 */
export function useListeningNowSSE() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const url = user?.id && accessToken
    ? `${apiUrl}/social/listening/stream?userId=${encodeURIComponent(user.id)}&token=${encodeURIComponent(accessToken)}`
    : null;

  const events = useMemo(() => ({
    'listening-update': (event: MessageEvent) => {
      try {
        const update: ListeningUpdate = JSON.parse(event.data);
        logger.debug('[SSE] Received listening update:', update);
        queryClient.invalidateQueries({ queryKey: socialKeys.listening() });
        queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      } catch (err) {
        logger.error('[SSE] Failed to parse listening update:', err);
      }
    },
  }), [queryClient]);

  useSSE({
    url,
    label: 'ListeningNow',
    onOpen: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.listening() });
      queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
    },
    events,
  });
}
