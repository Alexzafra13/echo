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
    // MEGA DEBUG - Imposible de perder
    console.warn('🚨🚨🚨 [AUTO-REFRESH] HOOK EJECUTÁNDOSE 🚨🚨🚨');
    console.table({
      isAuthenticated,
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0
    });

    // Solo conectar si el usuario está autenticado
    if (!isAuthenticated || !accessToken) {
      console.error('❌ [AUTO-REFRESH] NO AUTENTICADO - NO SE CONECTARÁ AL WEBSOCKET');
      console.log('Estado:', { isAuthenticated, accessToken: accessToken ? 'EXISTE' : 'NO EXISTE' });
      return;
    }

    console.warn('✅ [AUTO-REFRESH] Usuario autenticado, conectando a WebSocket...');

    // Conectar al namespace de scanner
    const wsService = WebSocketService;
    const socket = wsService.connect('scanner', accessToken);

    console.warn('🔌 [AUTO-REFRESH] Socket creado, esperando eventos...');

    // Handler para scan completado
    const handleScanCompleted = (data: any) => {
      console.warn('🎉🎉🎉 SCAN COMPLETADO - REFRESCANDO DATOS 🎉🎉🎉');
      console.log('Datos del scan:', data);

      // REFETCH inmediato (no solo invalidar) para que aparezcan los nuevos álbumes
      console.warn('🔄 Forzando refetch de queries...');

      queryClient.refetchQueries({ queryKey: ['albums'] });
      queryClient.refetchQueries({ queryKey: ['artists'] });
      queryClient.refetchQueries({ queryKey: ['tracks'] });

      // Mostrar notificación
      console.warn(`✅ ${data.albumsCreated} álbum(es) nuevo(s) detectado(s)`);
      alert(`🎵 Scan completado! ${data.albumsCreated} álbum(es) nuevo(s)`);
    };

    // Suscribirse al evento
    socket.on('scan:completed', handleScanCompleted);

    // Log TODOS los eventos WebSocket
    socket.onAny((eventName, ...args) => {
      console.warn(`📡 [WEBSOCKET] Evento recibido: ${eventName}`);
      console.log('Datos:', args);
    });

    console.warn('✅ [AUTO-REFRESH] Suscrito a scan:completed');

    // Cleanup
    return () => {
      console.warn('🧹 [AUTO-REFRESH] Limpiando suscripciones...');
      socket.off('scan:completed', handleScanCompleted);
      socket.offAny();
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
