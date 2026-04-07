import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useDashboardStats } from './useDashboard';

vi.mock('../api/dashboard.service', () => ({
  dashboardApi: {
    getStats: vi.fn(),
  },
}));

import { dashboardApi } from '../api/dashboard.service';

const mockStats = {
  libraryStats: {
    totalTracks: 100,
    totalAlbums: 10,
    totalArtists: 5,
    totalGenres: 3,
    totalDuration: 36000,
    totalStorage: 1073741824,
    tracksAddedToday: 2,
    albumsAddedToday: 1,
    artistsAddedToday: 0,
  },
  storageBreakdown: { music: 1000, metadata: 200, avatars: 50, radioFavicons: 10, total: 1260 },
  systemHealth: {
    database: 'healthy' as const,
    redis: 'healthy' as const,
    scanner: 'idle' as const,
    metadataApis: {
      lastfm: 'healthy' as const,
      fanart: 'healthy' as const,
      musicbrainz: 'healthy' as const,
    },
    storage: 'healthy' as const,
  },
  enrichmentStats: {
    today: { total: 5, successful: 4, failed: 1, byProvider: {} },
    week: { total: 20, successful: 18, failed: 2, byProvider: {} },
  },
  activityStats: { totalUsers: 3, activeUsersLast24h: 2, activeUsersLast7d: 3 },
  scanStats: {
    lastScan: {
      startedAt: null,
      finishedAt: null,
      status: null,
      tracksAdded: 0,
      tracksUpdated: 0,
      tracksDeleted: 0,
    },
    currentScan: { isRunning: false, startedAt: null, progress: 0 },
  },
  activeAlerts: { orphanedFiles: 0, pendingConflicts: 0, storageWarning: false, scanErrors: 0 },
  activityTimeline: [],
  recentActivities: [],
};

describe('useDashboardStats', () => {
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

  it('should start in loading state', () => {
    vi.mocked(dashboardApi.getStats).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeUndefined();
  });

  it('should return stats after loading', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(mockStats);
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('should return error on failure', async () => {
    vi.mocked(dashboardApi.getStats).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    // Hook has retry: 1, so it retries once before settling on error
    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 3000 }
    );

    expect(result.current.stats).toBeUndefined();
  });

  it('should provide a refresh function', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue(mockStats);
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.stats).toBeDefined());

    expect(typeof result.current.refresh).toBe('function');
  });
});
