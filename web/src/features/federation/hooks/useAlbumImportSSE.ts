import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { logger } from '@shared/utils/logger';

/**
 * Album import progress event from SSE
 */
export interface AlbumImportProgressEvent {
  importId: string;
  userId: string;
  albumName: string;
  artistName: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number; // 0-100
  currentTrack: number;
  totalTracks: number;
  downloadedSize: number;
  totalSize: number;
  error?: string;
}

export type ImportNotification =
  | { type: 'import_progress'; data: AlbumImportProgressEvent }
  | { type: 'import_completed'; data: AlbumImportProgressEvent }
  | { type: 'import_failed'; data: AlbumImportProgressEvent };

type ImportNotificationHandler = (notification: ImportNotification) => void;

/**
 * Singleton manager for the album import SSE connection.
 * Ensures only one EventSource connection exists.
 */
class AlbumImportSSEManager {
  private eventSource: EventSource | null = null;
  private handlers: Set<ImportNotificationHandler> = new Set();
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
      // EventSource cannot send Authorization headers, so we pass the token via query string
      const token = useAuthStore.getState().accessToken;
      const url = `${apiUrl}/federation/import/events/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = () => {
        logger.debug('[SSE] Connected to album import stream');
        this.reconnectAttempts = 0;
      };

      // Listen for import progress events
      this.eventSource.addEventListener('import_progress', (event: MessageEvent) => {
        try {
          const data: AlbumImportProgressEvent = JSON.parse(event.data);
          logger.debug('[SSE] Received import progress:', data);

          let notificationType: ImportNotification['type'] = 'import_progress';
          if (data.status === 'completed') {
            notificationType = 'import_completed';
          } else if (data.status === 'failed') {
            notificationType = 'import_failed';
          }

          this.handlers.forEach((handler) =>
            handler({ type: notificationType, data })
          );
        } catch (err) {
          logger.error('[SSE] Failed to parse import progress event:', err);
        }
      });

      this.eventSource.addEventListener('connected', (event: MessageEvent) => {
        logger.debug('[SSE] Album import stream connected:', event.data);
      });

      this.eventSource.addEventListener('keepalive', () => {
        // Keepalive received - connection is healthy
      });

      this.eventSource.onerror = () => {
        logger.error('[SSE] Album import connection error');
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
      logger.error('[SSE] Failed to create EventSource for album import:', err);
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

  subscribe(handler: ImportNotificationHandler) {
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
const albumImportSSEManager = new AlbumImportSSEManager();

/**
 * Hook for real-time album import progress via Server-Sent Events.
 *
 * Uses a shared singleton EventSource connection so multiple components
 * can subscribe without creating duplicate connections.
 *
 * @param onNotification - Optional callback when a notification is received
 * @returns Object with active imports and notifications
 */
export function useAlbumImportSSE(
  onNotification?: (notification: ImportNotification) => void
) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [activeImports, setActiveImports] = useState<Map<string, AlbumImportProgressEvent>>(
    new Map()
  );
  const [recentNotifications, setRecentNotifications] = useState<ImportNotification[]>([]);

  const handleNotification = useCallback(
    (notification: ImportNotification) => {
      const event = notification.data;

      // Update active imports map
      setActiveImports((prev) => {
        const newMap = new Map(prev);
        if (event.status === 'downloading') {
          newMap.set(event.importId, event);
        } else {
          // Remove completed/failed imports after a delay
          setTimeout(() => {
            setActiveImports((current) => {
              const updated = new Map(current);
              updated.delete(event.importId);
              return updated;
            });
          }, 5000);
          newMap.set(event.importId, event);
        }
        return newMap;
      });

      // Add to recent notifications (keep last 10)
      setRecentNotifications((prev) => [notification, ...prev].slice(0, 10));

      // Invalidate relevant queries on completion
      if (notification.type === 'import_completed') {
        // Refresh albums list
        queryClient.invalidateQueries({ queryKey: ['albums'] });
        queryClient.invalidateQueries({ queryKey: ['artists'] });
        // Refresh imports list
        queryClient.invalidateQueries({ queryKey: ['federation', 'imports'] });
      } else if (notification.type === 'import_failed') {
        queryClient.invalidateQueries({ queryKey: ['federation', 'imports'] });
      }

      // Call optional callback
      onNotification?.(notification);
    },
    [queryClient, onNotification]
  );

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to notifications
    const unsubscribe = albumImportSSEManager.subscribe(handleNotification);

    // Connect if not already connected
    if (
      !albumImportSSEManager.isConnected() ||
      albumImportSSEManager.getCurrentUserId() !== user.id
    ) {
      albumImportSSEManager.connect(user.id);
    }

    return () => {
      unsubscribe();
    };
  }, [user?.id, handleNotification]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id && !albumImportSSEManager.isConnected()) {
        albumImportSSEManager.connect(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  return {
    activeImports: Array.from(activeImports.values()),
    recentNotifications,
    clearNotifications: () => setRecentNotifications([]),
    hasActiveImports: activeImports.size > 0,
  };
}
