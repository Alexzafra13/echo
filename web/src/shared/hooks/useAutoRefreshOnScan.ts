import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store';
import WebSocketService from '../services/websocket.service';

// Refresca queries automáticamente al completarse un scan via WebSocket
export function useAutoRefreshOnScan() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const wsService = WebSocketService;
    const socket = wsService.connect('scanner', accessToken);

    const handleScanCompleted = () => {
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['albums'] }),
        queryClient.refetchQueries({ queryKey: ['artists'] }),
        queryClient.refetchQueries({ queryKey: ['tracks'] }),
      ]);
    };

    socket.on('scan:completed', handleScanCompleted);

    return () => {
      socket.off('scan:completed', handleScanCompleted);
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
