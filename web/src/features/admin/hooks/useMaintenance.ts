import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  maintenanceApi,
  type CleanupResult,
  type PopulateResult,
  type StoragePathsResponse,
} from '../api/maintenance.service';
import type { StorageStats } from '../components/MetadataSettingsPanel/StorageStatsGrid';

const STORAGE_STATS_KEY = ['admin', 'maintenance', 'storage-stats'] as const;
const STORAGE_PATHS_KEY = ['admin', 'maintenance', 'storage-paths'] as const;

function mapStatsResponse(
  data: Awaited<ReturnType<typeof maintenanceApi.getStorageStats>>
): StorageStats {
  return {
    totalSize: data.totalSize || 0,
    totalFiles: data.totalFiles || 0,
    artistImages: data.artistsWithMetadata || 0,
    albumImages: data.albumsWithCovers || 0,
    radioFavicons: data.radioFavicons || 0,
    radioFaviconSize: data.radioFaviconSize || 0,
    orphanedFiles: data.orphanedFiles || 0,
  };
}

export function useStorageStats() {
  return useQuery<StorageStats>({
    queryKey: STORAGE_STATS_KEY,
    queryFn: async () => {
      const data = await maintenanceApi.getStorageStats();
      return mapStatsResponse(data);
    },
  });
}

export function useStoragePaths() {
  return useQuery<StoragePathsResponse>({
    queryKey: STORAGE_PATHS_KEY,
    queryFn: () => maintenanceApi.getStoragePaths(),
  });
}

export function useCleanupOrphaned() {
  const queryClient = useQueryClient();
  return useMutation<CleanupResult>({
    mutationFn: () => maintenanceApi.cleanupOrphaned(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_STATS_KEY });
    },
  });
}

export function useClearCache() {
  return useMutation<void>({
    mutationFn: () => maintenanceApi.clearCache(),
  });
}

export function usePopulateSortNames() {
  const queryClient = useQueryClient();
  return useMutation<PopulateResult>({
    mutationFn: () => maintenanceApi.populateSortNames(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_STATS_KEY });
    },
  });
}
