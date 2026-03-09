import { useEffect, useCallback } from 'react';
import { useDjProgressStore } from '@shared/store';
import { useAuthStore } from '@shared/store';
import { WebSocketService } from '@shared/services/websocket.service';
import axios from 'axios';

interface DjProgressEvent {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

// Escucha progreso de análisis DJ via WebSocket y sincroniza con API al montar
export function useDjProgressListener() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateProgress = useDjProgressStore((state) => state.updateProgress);
  const clearProgress = useDjProgressStore((state) => state.clear);

  const handleDjProgress = useCallback(
    (data: DjProgressEvent) => {
      // If the backend reports not running and no pending tracks, clear the indicator
      if (!data.isRunning && data.pendingTracks === 0) {
        clearProgress();
      } else {
        updateProgress(data);
      }
    },
    [updateProgress, clearProgress]
  );

  useEffect(() => {
    if (!accessToken) return;

    const abortController = new AbortController();
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    axios
      .get(`${baseUrl}/scanner/dj-status`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: abortController.signal,
      })
      .then((res) => {
        if (res.data?.isRunning || res.data?.pendingTracks > 0) {
          updateProgress({
            isRunning: res.data.isRunning,
            pendingTracks: res.data.pendingTracks,
            processedInSession: res.data.processedInSession ?? 0,
            estimatedTimeRemaining: null,
          });
        } else {
          // Server says nothing is running - clear any stale UI state
          clearProgress();
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          // Only log real errors, not aborted requests from unmount
          if (import.meta.env.DEV) {
            console.warn('[DJ] Failed to fetch initial status:', err?.message);
          }
        }
      });

    return () => {
      abortController.abort();
    };
  }, [accessToken, updateProgress, clearProgress]);

  useEffect(() => {
    if (!accessToken) return;

    const wsService = WebSocketService.getInstance();
    const socket = wsService.connect('scanner', accessToken);

    socket.on('dj:progress', handleDjProgress);

    return () => {
      socket.off('dj:progress', handleDjProgress);
    };
  }, [accessToken, handleDjProgress]);
}
