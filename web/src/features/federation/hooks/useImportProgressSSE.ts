import { useEffect, useState, useCallback, useRef } from 'react';
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

/**
 * Hook for real-time album import progress via Server-Sent Events.
 * More reliable than WebSocket as SSE handles reconnection automatically.
 */
export function useImportProgressSSE() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [activeImports, setActiveImports] = useState<Map<string, AlbumImportProgressEvent>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleProgress = useCallback(
    (event: AlbumImportProgressEvent) => {
      logger.debug('[SSE] Received import progress:', event);

      // Update active imports map
      setActiveImports((prev) => {
        const newMap = new Map(prev);
        if (event.status === 'downloading') {
          newMap.set(event.importId, event);
        } else {
          // Keep completed/failed imports visible for a moment
          newMap.set(event.importId, event);
          // Remove after delay
          setTimeout(() => {
            setActiveImports((current) => {
              const updated = new Map(current);
              updated.delete(event.importId);
              return updated;
            });
          }, 5000);
        }
        return newMap;
      });

      // Invalidate relevant queries on completion
      if (event.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: ['albums'] });
        queryClient.invalidateQueries({ queryKey: ['artists'] });
        queryClient.invalidateQueries({ queryKey: ['federation', 'imports'] });
      } else if (event.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['federation', 'imports'] });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Build SSE URL
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const sseUrl = `${baseUrl}/api/federation/import/progress/stream?userId=${user.id}`;

    logger.debug('[SSE] Connecting to import progress stream:', sseUrl);

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      logger.debug('[SSE] Connected to import progress stream');
      setIsConnected(true);
    };

    eventSource.onerror = (error) => {
      logger.error('[SSE] Connection error:', error);
      setIsConnected(false);
      // EventSource will automatically try to reconnect
    };

    // Listen for import progress events
    eventSource.addEventListener('import:progress', (e) => {
      try {
        const data = JSON.parse(e.data) as AlbumImportProgressEvent;
        handleProgress(data);
      } catch (err) {
        logger.error('[SSE] Failed to parse progress event:', err);
      }
    });

    // Listen for connected event
    eventSource.addEventListener('connected', (e) => {
      logger.debug('[SSE] Received connected event:', e.data);
    });

    // Listen for keepalive
    eventSource.addEventListener('keepalive', () => {
      logger.debug('[SSE] Keepalive received');
    });

    // Cleanup
    return () => {
      logger.debug('[SSE] Disconnecting from import progress stream');
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [user?.id, handleProgress]);

  return {
    activeImports: Array.from(activeImports.values()),
    hasActiveImports: activeImports.size > 0,
    isConnected,
  };
}
