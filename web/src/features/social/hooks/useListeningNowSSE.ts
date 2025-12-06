import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
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
 *
 * This replaces polling with efficient push-based updates.
 */
export function useListeningNowSSE() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!user?.id) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/social/listening/stream?userId=${encodeURIComponent(user.id)}`;

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        logger.debug('[SSE] Connected to listening-now stream');
        reconnectAttemptsRef.current = 0;

        // Refetch data on connection to ensure we have the latest state
        // This catches any updates that happened while connecting
        queryClient.invalidateQueries({ queryKey: socialKeys.listening() });
        queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      };

      // Handle listening updates
      eventSource.addEventListener('listening-update', (event: MessageEvent) => {
        try {
          const update: ListeningUpdate = JSON.parse(event.data);
          logger.debug('[SSE] Received listening update:', update);

          // Invalidate queries to trigger refetch with new data
          queryClient.invalidateQueries({ queryKey: socialKeys.listening() });
          queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
        } catch (err) {
          logger.error('[SSE] Failed to parse listening update:', err);
        }
      });

      // Handle connection established
      eventSource.addEventListener('connected', (event: MessageEvent) => {
        logger.debug('[SSE] Listening stream connected:', event.data);
      });

      // Handle keepalive
      eventSource.addEventListener('keepalive', () => {
        // Keepalive received - connection is healthy
      });

      // Handle connection errors
      eventSource.onerror = (err) => {
        logger.error('[SSE] Connection error:', err);
        eventSource.close();

        // Exponential backoff for reconnection (max 30 seconds)
        const backoffDelay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffDelay);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      logger.error('[SSE] Failed to create EventSource:', err);
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    // Connect to SSE
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user?.id, connect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs, close connection to save resources
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      } else if (user?.id) {
        // User came back, reconnect
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, connect]);
}
