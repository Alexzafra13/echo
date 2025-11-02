import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store';
import WebSocketService from '../services/websocket.service';

/**
 * Hook para auto-refresh cuando se completa un scan
 *
 * Escucha eventos WebSocket de scan completado y automáticamente
 * invalida las queries de React Query para refrescar los datos.
 *
 * Uso:
 * ```tsx
 * function HomePage() {
 *   useAutoRefreshOnScan(); // Auto-refresh mágico ✨
 *
 *   const { data: albums } = useQuery(...); // Se refresca automáticamente
 * }
 * ```
 */
export function useAutoRefreshOnScan() {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Solo conectar si el usuario está autenticado
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Conectar al namespace de scanner
    const wsService = WebSocketService;
    const socket = wsService.connect('scanner', accessToken);

    // Handler para scan completado
    const handleScanCompleted = (data: any) => {
      console.log('🎉 Scan completado, refrescando datos...', data);

      // Invalidar queries relacionadas con música
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });

      // Mostrar notificación (opcional)
      console.log(`✅ ${data.albumsCreated} álbum(es) nuevo(s) detectado(s)`);
    };

    // Suscribirse al evento
    socket.on('scan:completed', handleScanCompleted);

    // Cleanup
    return () => {
      socket.off('scan:completed', handleScanCompleted);
      // No desconectamos el socket para permitir otros hooks
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
