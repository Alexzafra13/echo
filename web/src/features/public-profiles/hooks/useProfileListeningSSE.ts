import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { logger } from '@shared/utils/logger';

interface ListeningUpdate {
  userId: string;
  isPlaying: boolean;
  currentTrackId: string | null;
  timestamp: string;
}

/**
 * Hook for real-time "listening now" updates for a specific user profile
 *
 * Connects to SSE and invalidates the profile query when the target user
 * starts/stops playing music.
 *
 * @param targetUserId - The user ID of the profile being viewed
 */
export function useProfileListeningSSE(targetUserId: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Don't connect if viewing own profile or not logged in
    if (!currentUser?.id || currentUser.id === targetUserId) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/social/listening/stream?userId=${encodeURIComponent(currentUser.id)}`;

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        logger.debug('[SSE] Connected to profile listening stream');
        reconnectAttemptsRef.current = 0;
      };

      // Handle listening updates
      eventSource.addEventListener('listening-update', (event: MessageEvent) => {
        try {
          const update: ListeningUpdate = JSON.parse(event.data);

          // Only react to updates from the profile we're viewing
          if (update.userId === targetUserId) {
            logger.debug('[SSE] Profile listening update:', update);

            // Invalidate the profile query to refetch with new listening state
            queryClient.invalidateQueries({ queryKey: ['public-profile', targetUserId] });
          }
        } catch (err) {
          logger.error('[SSE] Failed to parse listening update:', err);
        }
      });

      // Handle connection established
      eventSource.addEventListener('connected', () => {
        logger.debug('[SSE] Profile listening stream connected');
      });

      // Handle keepalive
      eventSource.addEventListener('keepalive', () => {
        // Keepalive received
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
  }, [currentUser?.id, targetUserId, queryClient]);

  useEffect(() => {
    if (!currentUser?.id || !targetUserId || currentUser.id === targetUserId) return;

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
  }, [currentUser?.id, targetUserId, connect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      } else if (currentUser?.id && targetUserId && currentUser.id !== targetUserId) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id, targetUserId, connect]);
}
