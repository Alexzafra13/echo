import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { useImportProgressStore, ImportProgressEvent } from '@shared/store/importProgressStore';
import { logger } from '@shared/utils/logger';

// Global EventSource instance to prevent multiple connections
let globalEventSource: EventSource | null = null;
let globalUserId: string | null = null;
// Track cleanup timers for proper disposal
const cleanupTimers = new Set<ReturnType<typeof setTimeout>>();

/**
 * Hook for real-time album import progress via Server-Sent Events.
 * Uses a global store to persist state between page navigations.
 * Only one SSE connection is maintained globally.
 */
export function useImportProgressSSE() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const {
    activeImports,
    isConnected,
    updateImport,
    removeImport,
    setConnected,
  } = useImportProgressStore();

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!user?.id || !token) {
      return;
    }

    // If already connected for this user, skip
    if (globalEventSource && globalUserId === user.id && globalEventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    // Close existing connection if user changed
    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = null;
    }

    globalUserId = user.id;

    // Build SSE URL - pass JWT token for authentication (EventSource can't send headers)
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const sseUrl = `${baseUrl}/api/federation/import/progress/stream?token=${encodeURIComponent(token)}`;

    logger.debug('[SSE] Connecting to import progress stream:', sseUrl);

    const eventSource = new EventSource(sseUrl);
    globalEventSource = eventSource;

    eventSource.onopen = () => {
      logger.debug('[SSE] Connected to import progress stream');
      setConnected(true);
    };

    eventSource.onerror = (error) => {
      logger.error('[SSE] Connection error:', error);
      setConnected(false);
      // EventSource will automatically try to reconnect
    };

    // Handle import progress events
    const handleProgress = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ImportProgressEvent;
        logger.debug('[SSE] Received import progress:', data);

        updateImport(data);

        // Remove completed/failed imports after delay
        if (data.status === 'completed' || data.status === 'failed') {
          const timer = setTimeout(() => {
            cleanupTimers.delete(timer);
            removeImport(data.importId);
          }, 5000);
          cleanupTimers.add(timer);

          // Invalidate queries
          if (data.status === 'completed') {
            queryClientRef.current.invalidateQueries({ queryKey: ['albums'] });
            queryClientRef.current.invalidateQueries({ queryKey: ['artists'] });
          }
          queryClientRef.current.invalidateQueries({ queryKey: ['federation', 'imports'] });
        }
      } catch (err) {
        logger.error('[SSE] Failed to parse progress event:', err);
      }
    };

    eventSource.addEventListener('import:progress', handleProgress);

    eventSource.addEventListener('connected', (e) => {
      logger.debug('[SSE] Received connected event:', e.data);
    });

    eventSource.addEventListener('keepalive', () => {
      // Silent keepalive
    });

    // Cleanup only on unmount of last component using this hook
    // Don't close on every unmount to persist connection
    return () => {
      // Don't close - keep connection alive for persistence
    };
  }, [user?.id, token, setConnected, updateImport, removeImport]);

  // Cleanup on logout
  useEffect(() => {
    if (!user?.id && globalEventSource) {
      logger.debug('[SSE] Closing connection on logout');
      globalEventSource.close();
      globalEventSource = null;
      globalUserId = null;
      cleanupTimers.forEach(clearTimeout);
      cleanupTimers.clear();
      setConnected(false);
    }
  }, [user?.id, setConnected]);

  return {
    activeImports: Array.from(activeImports.values()),
    hasActiveImports: activeImports.size > 0,
    isConnected,
  };
}

// Re-export types
export type { ImportProgressEvent } from '@shared/store/importProgressStore';
