import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { useImportProgressStore, ImportProgressEvent } from '@shared/store/importProgressStore';
import { useUnifiedSSE } from '@shared/hooks/useUnifiedSSE';
import { logger } from '@shared/utils/logger';

// Track cleanup timers for proper disposal
const cleanupTimers = new Set<ReturnType<typeof setTimeout>>();

/**
 * Hook for real-time album import progress via the unified SSE stream.
 * Uses a global store to persist state between page navigations.
 */
export function useImportProgressSSE() {
  const eventSource = useUnifiedSSE();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { activeImports, isConnected, updateImport, removeImport, setConnected } =
    useImportProgressStore();

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  // Track connection state
  useEffect(() => {
    setConnected(!!eventSource && eventSource.readyState === EventSource.OPEN);
  }, [eventSource, setConnected]);

  // Listen for federation import progress events
  useEffect(() => {
    if (!eventSource) return;

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

    eventSource.addEventListener('federation:import:progress', handleProgress);

    return () => {
      eventSource.removeEventListener('federation:import:progress', handleProgress);
    };
  }, [eventSource, updateImport, removeImport]);

  // Cleanup on logout
  useEffect(() => {
    if (!user?.id) {
      cleanupTimers.forEach(clearTimeout);
      cleanupTimers.clear();
      useImportProgressStore.getState().clearAll();
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
