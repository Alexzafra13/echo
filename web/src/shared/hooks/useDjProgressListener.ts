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

  const handleDjProgress = useCallback((data: DjProgressEvent) => {
    updateProgress(data);
  }, [updateProgress]);

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
    }).catch(() => {});

    return () => {
      abortController.abort();
    };
  }, [accessToken, updateProgress]);

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
