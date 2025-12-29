import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tracksService } from '../tracks.service';
import { apiClient } from '@shared/services/api';
import type { Track } from '@shared/types/track.types';

// Mock the api client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('tracksService', () => {
  const mockTrack: Track = {
    id: 'track-1',
    title: 'Test Song',
    artistId: 'artist-1',
    artistName: 'Test Artist',
    albumId: 'album-1',
    albumName: 'Test Album',
    trackNumber: 1,
    discNumber: 1,
    duration: 240,
    year: 2024,
  };

  const mockTrack2: Track = {
    id: 'track-2',
    title: 'Another Song',
    artistId: 'artist-2',
    artistName: 'Another Artist',
    albumId: 'album-2',
    albumName: 'Another Album',
    trackNumber: 2,
    duration: 180,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should search tracks by query', async () => {
      const mockResponse = {
        data: [mockTrack, mockTrack2],
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await tracksService.search('Test');

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/search/Test', {
        params: undefined,
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Song');
    });

    it('should search with pagination params', async () => {
      const mockResponse = {
        data: [mockTrack],
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await tracksService.search('Test', { skip: 10, take: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/search/Test', {
        params: { skip: 10, take: 5 },
      });
    });

    it('should encode special characters in query', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });

      await tracksService.search('Rock & Roll');

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/search/Rock%20%26%20Roll', {
        params: undefined,
      });
    });

    it('should encode unicode characters in query', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });

      await tracksService.search('Música Española');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/tracks/search/M%C3%BAsica%20Espa%C3%B1ola',
        { params: undefined }
      );
    });

    it('should handle empty search results', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });

      const result = await tracksService.search('NonExistentTrack');

      expect(result).toHaveLength(0);
    });

    it('should handle API error', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(tracksService.search('Test')).rejects.toThrow('Network error');
    });
  });

  describe('getShuffled', () => {
    it('should fetch shuffled tracks', async () => {
      const mockResponse = {
        data: [mockTrack, mockTrack2],
        total: 100,
        seed: 0.12345,
        skip: 0,
        take: 20,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await tracksService.getShuffled();

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/shuffle', {
        params: undefined,
      });
      expect(result.data).toHaveLength(2);
      expect(result.seed).toBe(0.12345);
      expect(result.hasMore).toBe(true);
    });

    it('should fetch with seed for deterministic ordering', async () => {
      const mockResponse = {
        data: [mockTrack2, mockTrack], // Different order with same seed
        total: 100,
        seed: 0.54321,
        skip: 0,
        take: 20,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await tracksService.getShuffled({ seed: 0.54321 });

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/shuffle', {
        params: { seed: 0.54321 },
      });
      expect(result.seed).toBe(0.54321);
    });

    it('should fetch with pagination', async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 100,
        seed: 0.12345,
        skip: 20,
        take: 10,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await tracksService.getShuffled({ skip: 20, take: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/shuffle', {
        params: { skip: 20, take: 10 },
      });
      expect(result.skip).toBe(20);
      expect(result.take).toBe(10);
    });

    it('should fetch with seed and pagination for continuing sequence', async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 100,
        seed: 0.12345,
        skip: 40,
        take: 20,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await tracksService.getShuffled({ seed: 0.12345, skip: 40, take: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/tracks/shuffle', {
        params: { seed: 0.12345, skip: 40, take: 20 },
      });
    });

    it('should indicate no more tracks when hasMore is false', async () => {
      const mockResponse = {
        data: [mockTrack],
        total: 1,
        seed: 0.12345,
        skip: 0,
        take: 20,
        hasMore: false,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await tracksService.getShuffled();

      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(1);
    });

    it('should handle empty library', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        seed: 0,
        skip: 0,
        take: 20,
        hasMore: false,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await tracksService.getShuffled();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});
