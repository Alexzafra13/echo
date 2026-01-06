import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setRating,
  removeRating,
  getItemInteractionSummary,
  type ItemType,
  type RatingResponse,
  type ItemInteractionSummary,
} from '../interactions.service';
import { apiClient } from '../api';

vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('interactions.service', () => {
  const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setRating', () => {
    it('should set rating and return full response', async () => {
      const mockResponse: RatingResponse = {
        userId: 'user-1',
        itemId: 'track-1',
        itemType: 'track',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await setRating('track-1', 'track', 5);

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/rating', {
        itemId: 'track-1',
        itemType: 'track',
        rating: 5,
      });
      expect(result.rating).toBe(5);
    });

    it.each([1, 2, 3, 4, 5])('should accept rating %i', async (rating) => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { userId: 'user-1', itemId: 'track-1', itemType: 'track', rating, createdAt: new Date(), updatedAt: new Date() },
      });

      const result = await setRating('track-1', 'track', rating);

      expect(result.rating).toBe(rating);
    });

    it.each(itemTypes)('should work for %s type', async (itemType) => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { userId: 'user-1', itemId: `${itemType}-1`, itemType, rating: 4, createdAt: new Date(), updatedAt: new Date() },
      });

      await setRating(`${itemType}-1`, itemType, 4);

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/rating', {
        itemId: `${itemType}-1`,
        itemType,
        rating: 4,
      });
    });

    it('should propagate API errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(setRating('track-1', 'track', 5)).rejects.toThrow('Network error');
    });
  });

  describe('removeRating', () => {
    it('should remove rating', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await removeRating('track-1', 'track');

      expect(apiClient.delete).toHaveBeenCalledWith('/interactions/rating/track/track-1');
    });

    it.each(itemTypes)('should work for %s type', async (itemType) => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await removeRating(`${itemType}-1`, itemType);

      expect(apiClient.delete).toHaveBeenCalledWith(`/interactions/rating/${itemType}/${itemType}-1`);
    });

    it('should handle not found gracefully', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce({ response: { status: 404 } });

      await expect(removeRating('track-1', 'track')).rejects.toEqual({ response: { status: 404 } });
    });
  });

  describe('getItemInteractionSummary', () => {
    it('should get full interaction summary', async () => {
      const mockSummary: ItemInteractionSummary = {
        itemId: 'track-1',
        itemType: 'track',
        userRating: 4,
        averageRating: 4.2,
        totalRatings: 50,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const result = await getItemInteractionSummary('track-1', 'track');

      expect(apiClient.get).toHaveBeenCalledWith('/interactions/item/track/track-1');
      expect(result.userRating).toBe(4);
      expect(result.averageRating).toBe(4.2);
      expect(result.totalRatings).toBe(50);
    });

    it('should handle item with no user rating', async () => {
      const mockSummary: ItemInteractionSummary = {
        itemId: 'track-2',
        itemType: 'track',
        userRating: undefined,
        averageRating: 3.8,
        totalRatings: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const result = await getItemInteractionSummary('track-2', 'track');

      expect(result.userRating).toBeUndefined();
      expect(result.averageRating).toBe(3.8);
    });

    it('should handle item with no ratings at all', async () => {
      const mockSummary: ItemInteractionSummary = {
        itemId: 'track-3',
        itemType: 'track',
        userRating: undefined,
        averageRating: 0,
        totalRatings: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const result = await getItemInteractionSummary('track-3', 'track');

      expect(result.totalRatings).toBe(0);
      expect(result.averageRating).toBe(0);
    });

    it.each(itemTypes)('should work for %s type', async (itemType) => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { itemId: `${itemType}-1`, itemType, averageRating: 0, totalRatings: 0 },
      });

      await getItemInteractionSummary(`${itemType}-1`, itemType);

      expect(apiClient.get).toHaveBeenCalledWith(`/interactions/item/${itemType}/${itemType}-1`);
    });
  });
});
