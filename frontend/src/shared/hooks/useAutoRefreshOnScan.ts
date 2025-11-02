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
    console.log('[useAutoRefreshOnScan] Effect triggered', { isAuthenticated, hasToken: !!accessToken });

    // Solo conectar si el usuario está autenticado
    if (!isAuthenticated || !accessToken) {
      console.log('[useAutoRefreshOnScan] Not connecting - user not authenticated');
      return;
    }

    console.log('[useAutoRefreshOnScan] Connecting to scanner WebSocket...');

    // Conectar al namespace de scanner
    const wsService = WebSocketService;
    const socket = wsService.connect('scanner', accessToken);

    console.log('[useAutoRefreshOnScan] Socket connected, listening for scan:completed...');

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

    // Test: Log all events to see what's coming
    socket.onAny((eventName, ...args) => {
      console.log(`[WebSocket Event] ${eventName}`, args);
    });

    console.log('[useAutoRefreshOnScan] Subscribed to scan:completed event');

    // Cleanup
    return () => {
      console.log('[useAutoRefreshOnScan] Cleaning up...');
      socket.off('scan:completed', handleScanCompleted);
      socket.offAny();
      // No desconectamos el socket para permitir otros hooks
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
