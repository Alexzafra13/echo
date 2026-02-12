import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { useSSE } from '@shared/hooks';
import { logger } from '@shared/utils/logger';

interface ListeningUpdate {
  userId: string;
  isPlaying: boolean;
  currentTrackId: string | null;
  timestamp: string;
}

// SSE en tiempo real para estado de reproducción en perfil público
export function useProfileListeningSSE(targetUserId: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const canConnect = !!currentUser?.id && currentUser.id !== targetUserId && !!accessToken;
  const url = canConnect
    ? `${apiUrl}/social/listening/stream?userId=${encodeURIComponent(currentUser!.id)}&token=${encodeURIComponent(accessToken!)}`
    : null;

  const events = useMemo(() => ({
    'listening-update': (event: MessageEvent) => {
      try {
        const update: ListeningUpdate = JSON.parse(event.data);
        if (update.userId === targetUserId) {
          logger.debug('[SSE] Profile listening update:', update);
          queryClient.invalidateQueries({ queryKey: ['public-profile', targetUserId] });
        }
      } catch (err) {
        logger.error('[SSE] Failed to parse listening update:', err);
      }
    },
  }), [targetUserId, queryClient]);

  useSSE({
    url,
    label: 'ProfileListening',
    onOpen: () => {
      queryClient.invalidateQueries({ queryKey: ['public-profile', targetUserId] });
    },
    events,
  });
}
