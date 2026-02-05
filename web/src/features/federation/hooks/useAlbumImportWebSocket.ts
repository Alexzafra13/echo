import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { useWebSocketConnection } from '@shared/hooks/useWebSocketConnection';
import { logger } from '@shared/utils/logger';

/**
 * Album import progress event from WebSocket
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

/**
 * Hook for real-time album import progress via WebSocket.
 *
 * Connects to the /federation namespace and listens for import:progress events.
 *
 * @param onNotification - Optional callback when a notification is received
 * @returns Object with active imports and notifications
 */
export function useAlbumImportWebSocket(
  onNotification?: (notification: ImportNotification) => void
) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const [activeImports, setActiveImports] = useState<Map<string, AlbumImportProgressEvent>>(
    new Map()
  );
  const [recentNotifications, setRecentNotifications] = useState<ImportNotification[]>([]);
  const cleanupTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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
          const timer = setTimeout(() => {
            cleanupTimersRef.current.delete(timer);
            setActiveImports((current) => {
              const updated = new Map(current);
              updated.delete(event.importId);
              return updated;
            });
          }, 5000);
          cleanupTimersRef.current.add(timer);
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

  // Handle import:progress events
  const handleImportProgress = useCallback(
    (data: AlbumImportProgressEvent) => {
      logger.debug('[WebSocket] Received import progress:', data);

      let notificationType: ImportNotification['type'] = 'import_progress';
      if (data.status === 'completed') {
        notificationType = 'import_completed';
      } else if (data.status === 'failed') {
        notificationType = 'import_failed';
      }

      handleNotification({ type: notificationType, data });
    },
    [handleNotification]
  );

  // WebSocket connection
  const { socket, isConnected, emit } = useWebSocketConnection({
    namespace: 'federation',
    token,
    enabled: !!user?.id && !!token,
    onConnect: () => {
      logger.debug('[WebSocket] Connected to federation namespace');
    },
    onDisconnect: () => {
      logger.debug('[WebSocket] Disconnected from federation namespace');
    },
  });

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = cleanupTimersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  // Register event listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('import:progress', handleImportProgress);

    return () => {
      socket.off('import:progress', handleImportProgress);
    };
  }, [socket, isConnected, handleImportProgress]);

  // Subscribe to specific import (optional - the backend also broadcasts to user's sockets)
  const subscribeToImport = useCallback(
    (importId: string) => {
      if (isConnected) {
        emit('federation:subscribe', { importId });
      }
    },
    [isConnected, emit]
  );

  const unsubscribeFromImport = useCallback(
    (importId: string) => {
      if (isConnected) {
        emit('federation:unsubscribe', { importId });
      }
    },
    [isConnected, emit]
  );

  return {
    activeImports: Array.from(activeImports.values()),
    recentNotifications,
    clearNotifications: () => setRecentNotifications([]),
    hasActiveImports: activeImports.size > 0,
    isConnected,
    subscribeToImport,
    unsubscribeFromImport,
  };
}

// Re-export types for backwards compatibility
export type { AlbumImportProgressEvent as ImportProgressEvent };
