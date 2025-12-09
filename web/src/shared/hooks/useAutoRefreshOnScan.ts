import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useScannerSSE } from './useScannerSSE';

/**
 * Hook para auto-refresh cuando se completa un scan
 *
 * Escucha eventos SSE de scan completado y automáticamente
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
  const { completed } = useScannerSSE();

  useEffect(() => {
    if (completed) {
      // Scan completed - invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    }
  }, [completed, queryClient]);
}
