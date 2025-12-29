import { describe, it, expect, vi, beforeEach } from 'vitest';
import { artistsService } from '../artists.service';
import { apiClient } from '@shared/services/api';
import type {
  Artist,
  ArtistDetail,
  PaginatedArtists,
  ArtistStats,
  ArtistTopTracksResponse,
  RelatedArtistsResponse,
} from '../../types';

// Mock the api client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('artistsService', () => {
  const mockArtist: Artist = {
    id: 'artist-1',
    name: 'Test Artist',
    albumCount: 5,
    songCount: 50,
    orderArtistName: 'test artist',
  };

  const mockArtistDetail: ArtistDetail = {
    ...mockArtist,
    biography: 'A great artist biography',
    biographySource: 'Last.fm',
    mbzArtistId: 'mbz-123',
    externalUrl: 'http://lastfm.com/artist/test',
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

  describe('getAll', () => {
    it('should fetch all artists with default pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedArtists });

      const result = await artistsService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/artists', {
        params: { skip: 0, take: 100 },
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(100);
    });

    it('should fetch with custom pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { ...mockPaginatedArtists, skip: 50, take: 25 },
      });

      await artistsService.getAll({ skip: 50, take: 25 });

      expect(apiClient.get).toHaveBeenCalledWith('/artists', {
        params: { skip: 50, take: 25 },
      });
    });

    it('should handle empty result', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: [], total: 0, skip: 0, take: 100, hasMore: false },
      });

      const result = await artistsService.getAll();

      expect(result.data).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getById', () => {
    it('should fetch artist by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockArtistDetail });

      const result = await artistsService.getById('artist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1');
      expect(result.id).toBe('artist-1');
      expect(result.biography).toBe('A great artist biography');
    });

    it('should handle not found error', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Artist not found' },
        },
      };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(artistsService.getById('non-existent')).rejects.toEqual(error);
    });
  });

  describe('search', () => {
    it('should search artists by query', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedArtists });

      const result = await artistsService.search('Test');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/search/Test', {
        params: { skip: 0, take: 50 },
      });
      expect(result.data[0].name).toBe('Test Artist');
    });

    it('should encode special characters in query', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedArtists });

      await artistsService.search('AC/DC');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/search/AC%2FDC', {
        params: { skip: 0, take: 50 },
      });
    });

    it('should throw error for short query', async () => {
      await expect(artistsService.search('A')).rejects.toThrow(
        'Search query must be at least 2 characters'
      );

      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should throw error for empty query', async () => {
      await expect(artistsService.search('')).rejects.toThrow(
        'Search query must be at least 2 characters'
      );
    });

    it('should search with pagination params', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedArtists });

      await artistsService.search('Rock', { skip: 20, take: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/artists/search/Rock', {
        params: { skip: 20, take: 10 },
      });
    });
  });

  describe('getAlbums', () => {
    it('should fetch albums by artist ID', async () => {
      const mockAlbumsResponse = {
        data: [
          { id: 'album-1', title: 'Album 1', artist: 'Test Artist', artistId: 'artist-1' },
        ],
        total: 5,
        skip: 0,
        take: 100,
        hasMore: false,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlbumsResponse });

      const result = await artistsService.getAlbums('artist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/albums', {
        params: { skip: 0, take: 100 },
      });
      expect(result.data).toHaveLength(1);
    });

    it('should fetch with custom pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: [], total: 0, skip: 10, take: 5, hasMore: false },
      });

      await artistsService.getAlbums('artist-1', { skip: 10, take: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/albums', {
        params: { skip: 10, take: 5 },
      });
    });
  });

  describe('getStats', () => {
    it('should fetch artist statistics', async () => {
      const mockStats: ArtistStats = {
        artistId: 'artist-1',
        totalPlays: 10000,
        uniqueListeners: 500,
        avgCompletionRate: 0.85,
        skipRate: 0.12,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockStats });

      const result = await artistsService.getStats('artist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/stats');
      expect(result.totalPlays).toBe(10000);
      expect(result.avgCompletionRate).toBe(0.85);
    });
  });

  describe('getTopTracks', () => {
    it('should fetch top tracks with default params', async () => {
      const mockResponse: ArtistTopTracksResponse = {
        data: [
          {
            trackId: 'track-1',
            title: 'Hit Song',
            albumId: 'album-1',
            albumName: 'Best Album',
            duration: 240,
            playCount: 5000,
            uniqueListeners: 200,
          },
        ],
        artistId: 'artist-1',
        limit: 10,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await artistsService.getTopTracks('artist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/top-tracks', {
        params: { limit: 10, days: undefined },
      });
      expect(result.data[0].playCount).toBe(5000);
    });

    it('should fetch with custom limit and days', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: [], artistId: 'artist-1', limit: 5, days: 30 },
      });

      await artistsService.getTopTracks('artist-1', 5, 30);

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/top-tracks', {
        params: { limit: 5, days: 30 },
      });
    });
  });

  describe('getRelatedArtists', () => {
    it('should fetch related artists', async () => {
      const mockResponse: RelatedArtistsResponse = {
        data: [
          {
            id: 'artist-2',
            name: 'Similar Artist',
            albumCount: 3,
            songCount: 30,
            matchScore: 85,
          },
        ],
        artistId: 'artist-1',
        limit: 10,
        source: 'lastfm',
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await artistsService.getRelatedArtists('artist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/related', {
        params: { limit: 10 },
      });
      expect(result.data[0].matchScore).toBe(85);
      expect(result.source).toBe('lastfm');
    });

    it('should fetch with custom limit', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: [], artistId: 'artist-1', limit: 20, source: 'internal' },
      });

      await artistsService.getRelatedArtists('artist-1', 20);

      expect(apiClient.get).toHaveBeenCalledWith('/artists/artist-1/related', {
        params: { limit: 20 },
      });
    });

    it('should handle no related artists', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: [], artistId: 'artist-1', limit: 10, source: 'none' },
      });

      const result = await artistsService.getRelatedArtists('artist-1');

      expect(result.data).toHaveLength(0);
      expect(result.source).toBe('none');
    });
  });
});
