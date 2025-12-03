import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/services/api';

interface StartScanInput {
  path?: string;
  recursive?: boolean;
  pruneDeleted?: boolean;
}

interface StartScanResponse {
  id: string;
  status: string;
  startedAt: string;
  message: string;
}

interface ScanStatus {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  tracksAdded: number;
  tracksUpdated: number;
  tracksDeleted: number;
  errorMessage?: string;
}

interface ScansHistoryResponse {
  scans: ScanStatus[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Hook para iniciar un escaneo de la librería
 */
export function useStartScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StartScanInput = {}): Promise<StartScanResponse> => {
      const response = await apiClient.post('/scanner/start', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar queries del scanner para refrescar
      queryClient.invalidateQueries({ queryKey: ['scanner'] });
    },
  });
}

/**
 * Hook para obtener el estado de un escaneo específico
 */
export function useScanStatus(scanId?: string) {
  return useQuery({
    queryKey: ['scanner', 'status', scanId],
    queryFn: async (): Promise<ScanStatus> => {
      const response = await apiClient.get(`/scanner/${scanId}`);
      return response.data;
    },
    enabled: !!scanId,
    refetchInterval: (query) => {
      // Si está running, refrescar cada 3 segundos
      // Cuando implementemos SSE, quitaremos esto
      return query.state.data?.status === 'running' ? 3000 : false;
    },
  });
}

/**
 * Hook para obtener el historial de escaneos
 */
export function useScannerHistory(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['scanner', 'history', page, limit],
    queryFn: async (): Promise<ScansHistoryResponse> => {
      const response = await apiClient.get('/scanner', {
        params: { page, limit },
      });
      return response.data;
    },
    staleTime: 30000, // Cache por 30 segundos
  });
}

/**
 * Estado del análisis LUFS
 */
export interface LufsQueueStats {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  currentTrack: string | null;
  startedAt: string | null;
  estimatedTimeRemaining: string | null;
}

/**
 * Hook para obtener el estado del análisis LUFS
 */
export function useLufsStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: ['scanner', 'lufs-status'],
    queryFn: async (): Promise<LufsQueueStats> => {
      const response = await apiClient.get('/scanner/lufs-status');
      return response.data;
    },
    enabled,
    refetchInterval: (query) => {
      // Si está running o hay pendientes, refrescar cada 5 segundos
      const data = query.state.data;
      return (data?.isRunning || (data?.pendingTracks ?? 0) > 0) ? 5000 : 30000;
    },
    staleTime: 5000,
  });
}
