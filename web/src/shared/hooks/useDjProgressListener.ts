import { useEffect, useCallback } from 'react';
import { useDjProgressStore } from '@shared/store';
import { useAuthStore } from '@shared/store';
import { WebSocketService } from '@shared/services/websocket.service';

interface DjProgressEvent {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

/**
 * Global hook to listen for DJ analysis progress via WebSocket
 * Should be mounted once at app level (e.g., in MainLayout)
 */
export function useDjProgressListener() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateProgress = useDjProgressStore((state) => state.updateProgress);

  const handleDjProgress = useCallback((data: DjProgressEvent) => {
    updateProgress(data);
  }, [updateProgress]);

  useEffect(() => {
    if (!accessToken) return;

    // Connect to scanner namespace for DJ progress events
    const wsService = WebSocketService.getInstance();
    const socket = wsService.connect('scanner', accessToken);

    socket.on('dj:progress', handleDjProgress);

    return () => {
      socket.off('dj:progress', handleDjProgress);
    };
  }, [accessToken, handleDjProgress]);
}
