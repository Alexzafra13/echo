import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useArtists,
  useArtist,
  useArtistSearch,
  useArtistAlbums,
  useArtistStats,
  useArtistTopTracks,
  useRelatedArtists,
} from '../useArtists';
import { artistsService } from '../../services/artists.service';
import type { Artist, ArtistDetail, PaginatedArtists } from '../../types';

// Mock the artists service
vi.mock('../../services/artists.service', () => ({
  artistsService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    search: vi.fn(),
    getAlbums: vi.fn(),
    getStats: vi.fn(),
    getTopTracks: vi.fn(),
    getRelatedArtists: vi.fn(),
  },
}));

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useArtists hooks', () => {
  const mockArtist: Artist = {
    id: 'artist-1',
    name: 'Test Artist',
    albumCount: 5,
    songCount: 50,
  };

  const mockArtistDetail: ArtistDetail = {
    ...mockArtist,
    biography: 'Artist biography',
    size: 500000000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  };

  const mockPaginatedArtists: PaginatedArtists = {
    data: [mockArtist],
    total: 100,
    skip: 0,
    take: 100,
    hasMore: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useArtists', () => {
    it('should fetch all artists', async () => {
      vi.mocked(artistsService.getAll).mockResolvedValueOnce(mockPaginatedArtists);

      const { result } = renderHook(() => useArtists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(artistsService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should fetch with pagination params', async () => {
      vi.mocked(artistsService.getAll).mockResolvedValueOnce(mockPaginatedArtists);

      const { result } = renderHook(() => useArtists({ skip: 50, take: 25 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(artistsService.getAll).toHaveBeenCalledWith({ skip: 50, take: 25 });
    });
  });

  describe('useArtist', () => {
    it('should fetch artist by ID', async () => {
      vi.mocked(artistsService.getById).mockResolvedValueOnce(mockArtistDetail);

      const { result } = renderHook(() => useArtist('artist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('artist-1');
      expect(result.current.data?.biography).toBe('Artist biography');
      expect(artistsService.getById).toHaveBeenCalledWith('artist-1');
    });

    it('should not fetch when ID is undefined', () => {
      const { result } = renderHook(() => useArtist(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(artistsService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useArtistSearch', () => {
    it('should search artists', async () => {
      vi.mocked(artistsService.search).mockResolvedValueOnce(mockPaginatedArtists);

      const { result } = renderHook(() => useArtistSearch('Test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(artistsService.search).toHaveBeenCalledWith('Test', undefined);
    });

    it('should not search when query is too short', () => {
      const { result } = renderHook(() => useArtistSearch('A'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(artistsService.search).not.toHaveBeenCalled();
    });

    it('should search with minimum 2 characters', async () => {
      vi.mocked(artistsService.search).mockResolvedValueOnce(mockPaginatedArtists);

      const { result } = renderHook(() => useArtistSearch('AB'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(artistsService.search).toHaveBeenCalledWith('AB', undefined);
    });

    it('should pass pagination params', async () => {
      vi.mocked(artistsService.search).mockResolvedValueOnce(mockPaginatedArtists);

      const { result } = renderHook(() => useArtistSearch('Test', { skip: 10, take: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(artistsService.search).toHaveBeenCalledWith('Test', { skip: 10, take: 5 });
    });
  });

  describe('useArtistAlbums', () => {
    it('should fetch albums by artist', async () => {
      const mockAlbumsResponse = {
        data: [{
          id: 'album-1',
          title: 'Album 1',
          artist: 'Test Artist',
          artistId: 'artist-1',
          coverImage: '/covers/album-1.jpg',
          year: 2024,
          totalTracks: 10,
          addedAt: new Date('2024-01-01'),
        }],
        total: 5,
        skip: 0,
        take: 100,
        hasMore: false,
      };
      vi.mocked(artistsService.getAlbums).mockResolvedValueOnce(mockAlbumsResponse);

      const { result } = renderHook(() => useArtistAlbums('artist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(artistsService.getAlbums).toHaveBeenCalledWith('artist-1', undefined);
    });

    it('should not fetch when artistId is undefined', () => {
      const { result } = renderHook(() => useArtistAlbums(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(artistsService.getAlbums).not.toHaveBeenCalled();
    });
  });

  describe('useArtistStats', () => {
    it('should fetch artist statistics', async () => {
      const mockStats = {
        artistId: 'artist-1',
        totalPlays: 10000,
        uniqueListeners: 500,
        avgCompletionRate: 0.85,
        skipRate: 0.12,
      };
      vi.mocked(artistsService.getStats).mockResolvedValueOnce(mockStats);

      const { result } = renderHook(() => useArtistStats('artist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalPlays).toBe(10000);
      expect(artistsService.getStats).toHaveBeenCalledWith('artist-1');
    });

    it('should not fetch when artistId is undefined', () => {
      const { result } = renderHook(() => useArtistStats(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useArtistTopTracks', () => {
    it('should fetch top tracks with default params', async () => {
      const mockResponse = {
        data: [{
          trackId: 'track-1',
          title: 'Hit Song',
          albumId: 'album-1',
          albumName: 'Best Album',
          duration: 240,
          playCount: 5000,
          uniqueListeners: 200,
        }],
        artistId: 'artist-1',
        limit: 10,
      };
      vi.mocked(artistsService.getTopTracks).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useArtistTopTracks('artist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].playCount).toBe(5000);
      expect(artistsService.getTopTracks).toHaveBeenCalledWith('artist-1', 10, undefined);
    });

    it('should fetch with custom limit and days', async () => {
      const mockResponse = {
        data: [],
        artistId: 'artist-1',
        limit: 5,
        days: 30,
      };
      vi.mocked(artistsService.getTopTracks).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useArtistTopTracks('artist-1', 5, 30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(artistsService.getTopTracks).toHaveBeenCalledWith('artist-1', 5, 30);
    });

    it('should not fetch when artistId is undefined', () => {
      const { result } = renderHook(() => useArtistTopTracks(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useRelatedArtists', () => {
    it('should fetch related artists', async () => {
      const mockResponse = {
        data: [{
          id: 'artist-2',
          name: 'Similar Artist',
          albumCount: 3,
          songCount: 30,
          matchScore: 85,
        }],
        artistId: 'artist-1',
        limit: 10,
        source: 'external' as const,
      };
      vi.mocked(artistsService.getRelatedArtists).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRelatedArtists('artist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data[0].matchScore).toBe(85);
      expect(artistsService.getRelatedArtists).toHaveBeenCalledWith('artist-1', 10);
    });

    it('should fetch with custom limit', async () => {
      const mockResponse = {
        data: [],
        artistId: 'artist-1',
        limit: 20,
        source: 'internal' as const,
      };
      vi.mocked(artistsService.getRelatedArtists).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useRelatedArtists('artist-1', 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(artistsService.getRelatedArtists).toHaveBeenCalledWith('artist-1', 20);
    });

    it('should not fetch when artistId is undefined', () => {
      const { result } = renderHook(() => useRelatedArtists(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });
});
