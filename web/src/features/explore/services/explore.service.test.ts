import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exploreService } from './explore.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('exploreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUnplayedAlbums', () => {
    it('should call /explore/unplayed with params', async () => {
      const mockResponse = { albums: [], total: 0, limit: 12, offset: 0 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResponse });

      const result = await exploreService.getUnplayedAlbums(12, 0);

      expect(apiClient.get).toHaveBeenCalledWith('/explore/unplayed', {
        params: { limit: 12, offset: 0 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should use default params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { albums: [] } });

      await exploreService.getUnplayedAlbums();

      expect(apiClient.get).toHaveBeenCalledWith('/explore/unplayed', {
        params: { limit: 20, offset: 0 },
      });
    });
  });

  describe('getForgottenAlbums', () => {
    it('should call /explore/forgotten with monthsAgo param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { albums: [] } });

      await exploreService.getForgottenAlbums(10, 5, 6);

      expect(apiClient.get).toHaveBeenCalledWith('/explore/forgotten', {
        params: { limit: 10, offset: 5, monthsAgo: 6 },
      });
    });
  });

  describe('getHiddenGems', () => {
    it('should call /explore/hidden-gems', async () => {
      const mockTracks = { tracks: [{ id: '1', title: 'Gem' }], total: 1 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTracks });

      const result = await exploreService.getHiddenGems(15);

      expect(apiClient.get).toHaveBeenCalledWith('/explore/hidden-gems', { params: { limit: 15 } });
      expect(result).toEqual(mockTracks);
    });
  });

  describe('getRandomAlbums', () => {
    it('should call /explore/random/albums', async () => {
      const mockAlbums = { albums: [{ id: '1', name: 'Random' }] };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockAlbums });

      const result = await exploreService.getRandomAlbums(3);

      expect(apiClient.get).toHaveBeenCalledWith('/explore/random/albums', {
        params: { count: 3 },
      });
      expect(result).toEqual(mockAlbums);
    });
  });
});
