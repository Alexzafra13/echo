import { describe, it, expect, vi, beforeEach } from 'vitest';
import { albumsService } from '../albums.service';
import { apiClient } from '@shared/services/api';
import type { Album } from '../../types';

// Mock the api client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('albumsService', () => {
  const mockAlbum: Album = {
    id: 'album-1',
    title: 'Test Album',
    artist: 'Test Artist',
    artistId: 'artist-1',
    coverImage: '/covers/album-1.jpg',
    year: 2024,
    totalTracks: 12,
    duration: 3600,
    genres: ['Rock', 'Alternative'],
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

  describe('getRecent', () => {
    it('should fetch recently added albums', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockAlbum, mockAlbum2] });

      const result = await albumsService.getRecent();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/recent', {
        params: undefined,
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Album');
    });

    it('should fetch with take parameter', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockAlbum] });

      const result = await albumsService.getRecent(5);

      expect(apiClient.get).toHaveBeenCalledWith('/albums/recent', {
        params: { take: 5 },
      });
      expect(result).toHaveLength(1);
    });

    it('should handle empty result', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      const result = await albumsService.getRecent();

      expect(result).toHaveLength(0);
    });
  });

  describe('getTopPlayed', () => {
    it('should fetch top played albums', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockAlbum] });

      const result = await albumsService.getTopPlayed();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/top-played', {
        params: undefined,
      });
      expect(result[0].title).toBe('Test Album');
    });

    it('should fetch with take parameter', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockAlbum, mockAlbum2] });

      await albumsService.getTopPlayed(10);

      expect(apiClient.get).toHaveBeenCalledWith('/albums/top-played', {
        params: { take: 10 },
      });
    });
  });

  describe('getFeatured', () => {
    it('should fetch featured album', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlbum });

      const result = await albumsService.getFeatured();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/featured');
      expect(result.id).toBe('album-1');
      expect(result.title).toBe('Test Album');
    });

    it('should handle error when no featured album', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'No featured album found' },
        },
      };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(albumsService.getFeatured()).rejects.toEqual(error);
    });
  });

  describe('getById', () => {
    it('should fetch album by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlbum });

      const result = await albumsService.getById('album-1');

      expect(apiClient.get).toHaveBeenCalledWith('/albums/album-1');
      expect(result.id).toBe('album-1');
    });

    it('should handle not found error', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Album not found' },
        },
      };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(albumsService.getById('non-existent')).rejects.toEqual(error);
    });
  });

  describe('getAll', () => {
    it('should fetch all albums with pagination', async () => {
      const mockResponse = {
        data: [mockAlbum, mockAlbum2],
        total: 100,
        skip: 0,
        take: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getAll({ skip: 0, take: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/albums', {
        params: { skip: 0, take: 20 },
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(100);
    });

    it('should fetch without params', async () => {
      const mockResponse = {
        data: [mockAlbum],
        total: 1,
        skip: 0,
        take: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await albumsService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/albums', { params: undefined });
    });
  });

  describe('search', () => {
    it('should search albums by query', async () => {
      const mockResponse = {
        data: [mockAlbum],
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.search('Test');

      expect(apiClient.get).toHaveBeenCalledWith('/albums/search/Test');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Album');
    });

    it('should encode special characters in query', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });

      await albumsService.search('Rock & Roll');

      expect(apiClient.get).toHaveBeenCalledWith('/albums/search/Rock%20%26%20Roll');
    });

    it('should handle empty search results', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });

      const result = await albumsService.search('NonExistentAlbum');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAlbumTracks', () => {
    it('should fetch tracks for an album', async () => {
      const mockTracks = [
        { id: 'track-1', title: 'Track 1', duration: 180 },
        { id: 'track-2', title: 'Track 2', duration: 200 },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTracks });

      const result = await albumsService.getAlbumTracks('album-1');

      expect(apiClient.get).toHaveBeenCalledWith('/albums/album-1/tracks');
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Track 1');
    });

    it('should handle album with no tracks', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      const result = await albumsService.getAlbumTracks('album-empty');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAlphabetically', () => {
    it('should fetch albums sorted alphabetically', async () => {
      const mockResponse = {
        albums: [mockAlbum2, mockAlbum], // Another Album comes before Test Album
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getAlphabetically();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/alphabetical', {
        params: undefined,
      });
      expect(result.albums).toHaveLength(2);
      expect(result.albums[0].title).toBe('Another Album');
    });

    it('should fetch with pagination', async () => {
      const mockResponse = {
        albums: [mockAlbum],
        total: 100,
        page: 2,
        limit: 10,
        totalPages: 10,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getAlphabetically({ page: 2, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/albums/alphabetical', {
        params: { page: 2, limit: 10 },
      });
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(10);
    });
  });

  describe('getByArtist', () => {
    it('should fetch albums sorted by artist', async () => {
      const mockResponse = {
        albums: [mockAlbum2, mockAlbum],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getByArtist();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/by-artist', {
        params: undefined,
      });
      expect(result.albums).toHaveLength(2);
    });

    it('should fetch with pagination', async () => {
      const mockResponse = {
        albums: [],
        total: 50,
        page: 3,
        limit: 15,
        totalPages: 4,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await albumsService.getByArtist({ page: 3, limit: 15 });

      expect(apiClient.get).toHaveBeenCalledWith('/albums/by-artist', {
        params: { page: 3, limit: 15 },
      });
    });
  });

  describe('getRecentlyPlayed', () => {
    it('should fetch recently played albums', async () => {
      const mockResponse = {
        albums: [mockAlbum, mockAlbum2],
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getRecentlyPlayed();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/recently-played', {
        params: undefined,
      });
      expect(result.albums).toHaveLength(2);
    });

    it('should fetch with limit', async () => {
      const mockResponse = {
        albums: [mockAlbum],
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await albumsService.getRecentlyPlayed(5);

      expect(apiClient.get).toHaveBeenCalledWith('/albums/recently-played', {
        params: { limit: 5 },
      });
    });

    it('should handle user with no play history', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { albums: [] } });

      const result = await albumsService.getRecentlyPlayed();

      expect(result.albums).toHaveLength(0);
    });
  });

  describe('getFavorites', () => {
    it('should fetch favorite albums', async () => {
      const mockResponse = {
        albums: [mockAlbum],
        hasMore: false,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getFavorites();

      expect(apiClient.get).toHaveBeenCalledWith('/albums/favorites', {
        params: undefined,
      });
      expect(result.albums).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should fetch with pagination', async () => {
      const mockResponse = {
        albums: [mockAlbum, mockAlbum2],
        page: 1,
        limit: 20,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await albumsService.getFavorites({ page: 1, limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/albums/favorites', {
        params: { page: 1, limit: 20 },
      });
      expect(result.hasMore).toBe(true);
    });

    it('should handle user with no favorites', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { albums: [] } });

      const result = await albumsService.getFavorites();

      expect(result.albums).toHaveLength(0);
    });
  });
});
