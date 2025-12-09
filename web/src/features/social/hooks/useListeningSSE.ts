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

type ListeningUpdateHandler = (update: ListeningUpdate) => void;

/**
 * Singleton manager for the listening SSE connection.
 * Ensures only one EventSource connection exists regardless of how many
 * hooks are subscribed.
 */
class ListeningSSEManager {
  private eventSource: EventSource | null = null;
  private handlers: Set<ListeningUpdateHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private currentUserId: string | null = null;

  connect(userId: string) {
    // Already connected for this user
    if (this.eventSource && this.currentUserId === userId) {
      return;
    }

    // Different user - close existing connection
    if (this.eventSource && this.currentUserId !== userId) {
      this.disconnect();
    }

    this.currentUserId = userId;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/social/listening/stream?userId=${encodeURIComponent(userId)}`;

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        logger.debug('[SSE] Connected to listening-now stream');
        this.reconnectAttempts = 0;
      };

      this.eventSource.addEventListener('listening-update', (event: MessageEvent) => {
        try {
          const update: ListeningUpdate = JSON.parse(event.data);
          logger.debug('[SSE] Received listening update:', update);
          this.handlers.forEach((handler) => handler(update));
        } catch (err) {
          logger.error('[SSE] Failed to parse listening update:', err);
        }
      });

      this.eventSource.addEventListener('connected', (event: MessageEvent) => {
        logger.debug('[SSE] Listening stream connected:', event.data);
        // Notify handlers that connection is established (for initial data fetch)
        this.handlers.forEach((handler) =>
          handler({ userId: '', isPlaying: false, currentTrackId: null, timestamp: 'connected' })
        );
      });

      this.eventSource.addEventListener('keepalive', () => {
        // Keepalive received - connection is healthy
      });

      this.eventSource.onerror = () => {
        logger.error('[SSE] Connection error');
        this.eventSource?.close();
        this.eventSource = null;

        // Only reconnect if we still have subscribers
        if (this.handlers.size > 0) {
          const backoffDelay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            30000
          );
          this.reconnectAttempts += 1;

          this.reconnectTimeout = setTimeout(() => {
            if (this.currentUserId) {
              this.connect(this.currentUserId);
            }
          }, backoffDelay);
        }
      };
    } catch (err) {
      logger.error('[SSE] Failed to create EventSource:', err);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.currentUserId = null;
    this.reconnectAttempts = 0;
  }

  subscribe(handler: ListeningUpdateHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
      // Disconnect if no more subscribers
      if (this.handlers.size === 0) {
        this.disconnect();
      }
    };
  }

  isConnected() {
    return this.eventSource !== null;
  }

  getCurrentUserId() {
    return this.currentUserId;
  }
}

// Singleton instance
const listeningSSEManager = new ListeningSSEManager();

/**
 * Hook for real-time "listening now" updates via Server-Sent Events.
 *
 * Uses a shared singleton EventSource connection so multiple components
 * can subscribe without creating duplicate connections.
 *
 * When a friend starts/stops playing music, this hook receives the update
 * instantly and invalidates the relevant React Query caches.
 */
export function useListeningNowSSE() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasConnectedRef = useRef(false);

  const handleUpdate = useCallback(
    (update: ListeningUpdate) => {
      // Special "connected" event for initial data fetch
      if (update.timestamp === 'connected') {
        queryClient.invalidateQueries({ queryKey: socialKeys.listening() });
        queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
        return;
      }

      // Real update - invalidate queries
      queryClient.invalidateQueries({ queryKey: socialKeys.listening() });
      queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
    },
    [queryClient]
  );

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to updates
    const unsubscribe = listeningSSEManager.subscribe(handleUpdate);

    // Connect if not already connected
    if (!listeningSSEManager.isConnected() || listeningSSEManager.getCurrentUserId() !== user.id) {
      listeningSSEManager.connect(user.id);
      hasConnectedRef.current = true;
    }

    return () => {
      unsubscribe();
    };
  }, [user?.id, handleUpdate]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't disconnect - other components might still need it
        // The manager will disconnect when all subscribers are gone
      } else if (user?.id && !listeningSSEManager.isConnected()) {
        listeningSSEManager.connect(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);
}

/**
 * Hook for real-time "listening now" updates for a specific user profile.
 *
 * Uses the shared singleton EventSource connection and only reacts to
 * updates from the target user.
 *
 * @param targetUserId - The user ID of the profile being viewed
 */
export function useProfileListeningSSE(targetUserId: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const handleUpdate = useCallback(
    (update: ListeningUpdate) => {
      // Special "connected" event for initial data fetch
      if (update.timestamp === 'connected') {
        queryClient.invalidateQueries({ queryKey: ['public-profile', targetUserId] });
        return;
      }

      // Only react to updates from the profile we're viewing
      if (update.userId === targetUserId) {
        logger.debug('[SSE] Profile listening update:', update);
        queryClient.invalidateQueries({ queryKey: ['public-profile', targetUserId] });
      }
    },
    [queryClient, targetUserId]
  );

  useEffect(() => {
    // Don't connect if viewing own profile or not logged in
    if (!currentUser?.id || currentUser.id === targetUserId) return;

    // Subscribe to updates
    const unsubscribe = listeningSSEManager.subscribe(handleUpdate);

    // Connect if not already connected
    if (!listeningSSEManager.isConnected() || listeningSSEManager.getCurrentUserId() !== currentUser.id) {
      listeningSSEManager.connect(currentUser.id);
    }

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, targetUserId, handleUpdate]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser?.id && !listeningSSEManager.isConnected()) {
        listeningSSEManager.connect(currentUser.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id]);
}
