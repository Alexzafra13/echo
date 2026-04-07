import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useRecentAlbums,
  useTopPlayedAlbums,
  useFeaturedAlbum,
  useAlbum,
  useAlbums,
  useAlbumSearch,
  useAlbumTracks,
  useAlbumsAlphabetically,
  useAlbumsByArtist,
  useAlbumsRecentlyPlayed,
  useAlbumsFavorites,
} from '../useAlbums';
import { albumsService } from '../../services';
import type { Album } from '../../types';

// Mock the albums service
vi.mock('../../services', () => ({
  albumsService: {
    getRecent: vi.fn(),
    getTopPlayed: vi.fn(),
    getFeatured: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    search: vi.fn(),
    getAlbumTracks: vi.fn(),
    getAlphabetically: vi.fn(),
    getByArtist: vi.fn(),
    getRecentlyPlayed: vi.fn(),
    getFavorites: vi.fn(),
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

describe('useAlbums hooks', () => {
  const mockAlbum: Album = {
    id: 'album-1',
    title: 'Test Album',
    artist: 'Test Artist',
    artistId: 'artist-1',
    coverImage: '/covers/album-1.jpg',
    year: 2024,
    totalTracks: 12,
    addedAt: new Date('2024-01-01'),
  };

  const mockAlbum2: Album = {
    id: 'album-2',
    title: 'Another Album',
    artist: 'Another Artist',
    artistId: 'artist-2',
    coverImage: '/covers/album-2.jpg',
    year: 2023,
    totalTracks: 10,
    addedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRecentAlbums', () => {
    it('should fetch recent albums', async () => {
      vi.mocked(albumsService.getRecent).mockResolvedValueOnce([mockAlbum, mockAlbum2]);

      const { result } = renderHook(() => useRecentAlbums(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(albumsService.getRecent).toHaveBeenCalledWith(undefined);
    });

    it('should fetch with take parameter', async () => {
      vi.mocked(albumsService.getRecent).mockResolvedValueOnce([mockAlbum]);

      const { result } = renderHook(() => useRecentAlbums(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(albumsService.getRecent).toHaveBeenCalledWith(5);
    });
  });

  describe('useTopPlayedAlbums', () => {
    it('should fetch top played albums', async () => {
      vi.mocked(albumsService.getTopPlayed).mockResolvedValueOnce([mockAlbum]);

      const { result } = renderHook(() => useTopPlayedAlbums(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].title).toBe('Test Album');
    });

    it('should pass take parameter', async () => {
      vi.mocked(albumsService.getTopPlayed).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useTopPlayedAlbums(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(albumsService.getTopPlayed).toHaveBeenCalledWith(10);
    });
  });

  describe('useFeaturedAlbum', () => {
    it('should fetch featured album', async () => {
      vi.mocked(albumsService.getFeatured).mockResolvedValueOnce(mockAlbum);

      const { result } = renderHook(() => useFeaturedAlbum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('album-1');
      expect(result.current.data?.title).toBe('Test Album');
    });

    it('should handle error', async () => {
      const error = new Error('No featured album');
      vi.mocked(albumsService.getFeatured).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useFeaturedAlbum(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAlbum', () => {
    it('should fetch album by ID', async () => {
      vi.mocked(albumsService.getById).mockResolvedValueOnce(mockAlbum);

      const { result } = renderHook(() => useAlbum('album-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('album-1');
      expect(albumsService.getById).toHaveBeenCalledWith('album-1');
    });

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(() => useAlbum(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(albumsService.getById).not.toHaveBeenCalled();
    });
  });

  describe('useAlbums', () => {
    it('should fetch all albums', async () => {
      const mockResponse = {
        data: [mockAlbum, mockAlbum2],
        total: 2,
        skip: 0,
        take: 20,
        hasMore: false,
      };
      vi.mocked(albumsService.getAll).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbums(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });

    it('should fetch with pagination', async () => {
      const mockResponse = {
        data: [mockAlbum],
        total: 100,
        skip: 20,
        take: 10,
        hasMore: true,
      };
      vi.mocked(albumsService.getAll).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbums({ skip: 20, take: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(albumsService.getAll).toHaveBeenCalledWith({ skip: 20, take: 10 });
    });
  });

  describe('useAlbumSearch', () => {
    it('should search albums', async () => {
      vi.mocked(albumsService.search).mockResolvedValueOnce([mockAlbum]);

      const { result } = renderHook(() => useAlbumSearch('Test'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(albumsService.search).toHaveBeenCalledWith('Test');
    });

    it('should not search when query is empty', () => {
      const { result } = renderHook(() => useAlbumSearch(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(albumsService.search).not.toHaveBeenCalled();
    });
  });

  describe('useAlbumTracks', () => {
    it('should fetch album tracks', async () => {
      const mockTracks = [
        { id: 'track-1', title: 'Track 1', duration: 180 },
        { id: 'track-2', title: 'Track 2', duration: 200 },
      ];
      vi.mocked(albumsService.getAlbumTracks).mockResolvedValueOnce(mockTracks);

      const { result } = renderHook(() => useAlbumTracks('album-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(albumsService.getAlbumTracks).toHaveBeenCalledWith('album-1');
    });

    it('should not fetch when albumId is empty', () => {
      const { result } = renderHook(() => useAlbumTracks(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(albumsService.getAlbumTracks).not.toHaveBeenCalled();
    });
  });

  describe('useAlbumsAlphabetically', () => {
    it('should fetch albums alphabetically', async () => {
      const mockResponse = {
        data: [mockAlbum2, mockAlbum],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      };
      vi.mocked(albumsService.getAlphabetically).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsAlphabetically(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.data[0].title).toBe('Another Album');
    });

    it('should fetch with pagination params', async () => {
      const mockResponse = {
        data: [],
        total: 100,
        page: 3,
        limit: 10,
        totalPages: 10,
        hasMore: true,
      };
      vi.mocked(albumsService.getAlphabetically).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsAlphabetically({ page: 3, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(albumsService.getAlphabetically).toHaveBeenCalledWith({ page: 3, limit: 10 });
    });
  });

  describe('useAlbumsByArtist', () => {
    it('should fetch albums by artist', async () => {
      const mockResponse = {
        data: [mockAlbum, mockAlbum2],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      };
      vi.mocked(albumsService.getByArtist).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsByArtist(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(2);
    });
  });

  describe('useAlbumsRecentlyPlayed', () => {
    it('should fetch recently played albums', async () => {
      const mockResponse = {
        data: [mockAlbum],
      };
      vi.mocked(albumsService.getRecentlyPlayed).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsRecentlyPlayed(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(albumsService.getRecentlyPlayed).toHaveBeenCalledWith(undefined);
    });

    it('should fetch with limit', async () => {
      const mockResponse = {
        data: [mockAlbum, mockAlbum2],
      };
      vi.mocked(albumsService.getRecentlyPlayed).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsRecentlyPlayed(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(albumsService.getRecentlyPlayed).toHaveBeenCalledWith(10);
    });
  });

  describe('useAlbumsFavorites', () => {
    it('should fetch favorite albums', async () => {
      const mockResponse = {
        data: [mockAlbum],
        page: 1,
        limit: 20,
        hasMore: false,
      };
      vi.mocked(albumsService.getFavorites).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsFavorites(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.hasMore).toBe(false);
    });

    it('should fetch with pagination', async () => {
      const mockResponse = {
        data: [mockAlbum, mockAlbum2],
        page: 2,
        limit: 10,
        hasMore: true,
      };
      vi.mocked(albumsService.getFavorites).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAlbumsFavorites({ page: 2, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(albumsService.getFavorites).toHaveBeenCalledWith({ page: 2, limit: 10 });
      expect(result.current.data?.hasMore).toBe(true);
    });
  });
});
