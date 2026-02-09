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

/**
 * Global hook to listen for DJ analysis progress via WebSocket
 * Should be mounted once at app level (e.g., in MainLayout)
 *
 * On mount/reconnect, fetches current state from the API so progress
 * is visible even if the user navigated away and came back.
 */
export function useDjProgressListener() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateProgress = useDjProgressStore((state) => state.updateProgress);

  const handleDjProgress = useCallback((data: DjProgressEvent) => {
    updateProgress(data);
  }, [updateProgress]);

  // Fetch current DJ status from API on mount
  useEffect(() => {
    if (!accessToken) return;

    const abortController = new AbortController();
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    axios.get(`${baseUrl}/scanner/dj-status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: abortController.signal,
    }).then((res) => {
      if (res.data?.isRunning) {
        updateProgress({
          isRunning: res.data.isRunning,
          pendingTracks: res.data.pendingTracks,
          processedInSession: res.data.processedInSession,
          estimatedTimeRemaining: null,
        });
      }
    }).catch(() => {
      // Silently ignore — user may not be admin or request was aborted
    });

    return () => {
      abortController.abort();
    };
  }, [accessToken, updateProgress]);

  // Listen for real-time updates via WebSocket
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
