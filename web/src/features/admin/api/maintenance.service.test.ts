import { describe, it, expect, vi, beforeEach } from 'vitest';
import { maintenanceApi } from './maintenance.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('maintenanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStorageStats', () => {
    it('should call correct endpoint and return data', async () => {
      const mockStats = { totalSize: 1024, totalFiles: 10 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStats });

      const result = await maintenanceApi.getStorageStats();

      expect(apiClient.get).toHaveBeenCalledWith('/maintenance/storage/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getStoragePaths', () => {
    it('should call correct endpoint and return data', async () => {
      const mockPaths = { musicPath: '/music', metadataPath: '/meta' };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaths });

      const result = await maintenanceApi.getStoragePaths();

      expect(apiClient.get).toHaveBeenCalledWith('/maintenance/storage/paths');
      expect(result).toEqual(mockPaths);
    });
  });

  describe('cleanupOrphaned', () => {
    it('should POST to cleanup endpoint with dryRun=false', async () => {
      const mockResult = { filesRemoved: 5, spaceFree: 1024, orphanedFiles: [], errors: [] };
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockResult });

      const result = await maintenanceApi.cleanupOrphaned();

      expect(apiClient.post).toHaveBeenCalledWith('/maintenance/cleanup/orphaned?dryRun=false');
      expect(result).toEqual(mockResult);
    });
  });

  describe('clearCache', () => {
    it('should POST to cache clear endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      await maintenanceApi.clearCache();

      expect(apiClient.post).toHaveBeenCalledWith('/admin/settings/cache/clear');
    });
  });

  describe('populateSortNames', () => {
    it('should POST to populate endpoint and return result', async () => {
      const mockResult = { albumsUpdated: 50, artistsUpdated: 20, duration: 1500 };
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockResult });

      const result = await maintenanceApi.populateSortNames();

      expect(apiClient.post).toHaveBeenCalledWith('/maintenance/populate-sort-names');
      expect(result).toEqual(mockResult);
    });
  });
});
