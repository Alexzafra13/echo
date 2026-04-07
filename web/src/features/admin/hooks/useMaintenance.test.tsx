import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import {
  useStorageStats,
  useStoragePaths,
  useCleanupOrphaned,
  useClearCache,
  usePopulateSortNames,
} from './useMaintenance';

vi.mock('../api/maintenance.service', () => ({
  maintenanceApi: {
    getStorageStats: vi.fn(),
    getStoragePaths: vi.fn(),
    cleanupOrphaned: vi.fn(),
    clearCache: vi.fn(),
    populateSortNames: vi.fn(),
  },
}));

import { maintenanceApi } from '../api/maintenance.service';

const mockRawStats = {
  totalSize: 1073741824,
  totalFiles: 1500,
  artistsWithMetadata: 50,
  albumsWithCovers: 200,
  radioFavicons: 10,
  radioFaviconSize: 5000,
  orphanedFiles: 3,
};

const mockPaths = {
  dataPath: '/data/echo',
  musicPath: '/music',
  metadataPath: '/data/echo/metadata',
  albumCoversPath: '/data/echo/covers',
  artistImagesPath: '/data/echo/artists',
  userUploadsPath: '/data/echo/uploads',
  isReadOnlyMusic: false,
};

describe('useMaintenance hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  describe('useStorageStats', () => {
    it('should map API response to StorageStats format', async () => {
      vi.mocked(maintenanceApi.getStorageStats).mockResolvedValue(mockRawStats);
      const { result } = renderHook(() => useStorageStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual({
        totalSize: 1073741824,
        totalFiles: 1500,
        artistImages: 50,
        albumImages: 200,
        radioFavicons: 10,
        radioFaviconSize: 5000,
        orphanedFiles: 3,
      });
    });

    it('should handle error', async () => {
      vi.mocked(maintenanceApi.getStorageStats).mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useStorageStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useStoragePaths', () => {
    it('should return paths data', async () => {
      vi.mocked(maintenanceApi.getStoragePaths).mockResolvedValue(mockPaths);
      const { result } = renderHook(() => useStoragePaths(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.data).toEqual(mockPaths));
    });
  });

  describe('useCleanupOrphaned', () => {
    it('should call cleanup API and return result', async () => {
      const cleanupResult = { filesRemoved: 5, spaceFree: 1024, orphanedFiles: [], errors: [] };
      vi.mocked(maintenanceApi.cleanupOrphaned).mockResolvedValue(cleanupResult);

      const { result } = renderHook(() => useCleanupOrphaned(), { wrapper: createWrapper() });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(cleanupResult);
    });
  });

  describe('useClearCache', () => {
    it('should call clearCache API', async () => {
      vi.mocked(maintenanceApi.clearCache).mockResolvedValue(undefined);

      const { result } = renderHook(() => useClearCache(), { wrapper: createWrapper() });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(maintenanceApi.clearCache).toHaveBeenCalledOnce();
    });
  });

  describe('usePopulateSortNames', () => {
    it('should call populate API and return result', async () => {
      const populateResult = { albumsUpdated: 150, artistsUpdated: 45, duration: 2500 };
      vi.mocked(maintenanceApi.populateSortNames).mockResolvedValue(populateResult);

      const { result } = renderHook(() => usePopulateSortNames(), { wrapper: createWrapper() });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(populateResult);
    });
  });
});
