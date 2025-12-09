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
