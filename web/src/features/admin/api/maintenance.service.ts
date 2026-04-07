import { apiClient } from '@shared/services/api';

export interface StorageStatsResponse {
  totalSize: number;
  totalFiles: number;
  artistsWithMetadata: number;
  albumsWithCovers: number;
  radioFavicons: number;
  radioFaviconSize: number;
  orphanedFiles: number;
}

export interface StoragePathsResponse {
  dataPath: string;
  musicPath: string;
  metadataPath: string;
  albumCoversPath: string;
  artistImagesPath: string;
  userUploadsPath: string;
  isReadOnlyMusic: boolean;
}

export interface CleanupResult {
  filesRemoved: number;
  spaceFree: number;
  orphanedFiles: string[];
  errors: string[];
}

export interface PopulateResult {
  albumsUpdated: number;
  artistsUpdated: number;
  duration: number;
}

export const maintenanceApi = {
  async getStorageStats(): Promise<StorageStatsResponse> {
    const response = await apiClient.get<StorageStatsResponse>('/maintenance/storage/stats');
    return response.data;
  },

  async getStoragePaths(): Promise<StoragePathsResponse> {
    const response = await apiClient.get<StoragePathsResponse>('/maintenance/storage/paths');
    return response.data;
  },

  async cleanupOrphaned(): Promise<CleanupResult> {
    const response = await apiClient.post<CleanupResult>(
      '/maintenance/cleanup/orphaned?dryRun=false'
    );
    return response.data;
  },

  async clearCache(): Promise<void> {
    await apiClient.post('/admin/settings/cache/clear');
  },

  async populateSortNames(): Promise<PopulateResult> {
    const response = await apiClient.post<PopulateResult>('/maintenance/populate-sort-names');
    return response.data;
  },
};
