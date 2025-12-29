import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toggleLike,
  toggleDislike,
  setRating,
  removeRating,
  getItemInteractionSummary,
  type ItemType,
  type ToggleLikeResponse,
  type ToggleDislikeResponse,
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

  describe('toggleLike', () => {
    it('should toggle like on and return likedAt', async () => {
      const mockResponse: ToggleLikeResponse = { liked: true, likedAt: new Date() };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await toggleLike('track-1', 'track');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/like', {
        itemId: 'track-1',
        itemType: 'track',
      });
      expect(result.liked).toBe(true);
    });

    it('should toggle like off', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { liked: false } });

      const result = await toggleLike('track-1', 'track');

      expect(result.liked).toBe(false);
      expect(result.likedAt).toBeUndefined();
    });

    it.each(itemTypes)('should work for %s type', async (itemType) => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { liked: true } });

      await toggleLike(`${itemType}-1`, itemType);

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/like', {
        itemId: `${itemType}-1`,
        itemType,
      });
    });

    it('should propagate API errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(toggleLike('track-1', 'track')).rejects.toThrow('Network error');
    });
  });

  describe('toggleDislike', () => {
    it('should toggle dislike on', async () => {
      const mockResponse: ToggleDislikeResponse = { disliked: true, dislikedAt: new Date() };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await toggleDislike('track-1', 'track');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/dislike', {
        itemId: 'track-1',
        itemType: 'track',
      });
      expect(result.disliked).toBe(true);
    });

    it('should toggle dislike off', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { disliked: false } });

      const result = await toggleDislike('track-1', 'track');

      expect(result.disliked).toBe(false);
    });
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
  });

  describe('removeRating', () => {
    it('should remove rating', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await removeRating('track-1', 'track');

      expect(apiClient.delete).toHaveBeenCalledWith('/interactions/rating/track/track-1');
    });

    it('should handle not found error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce({ response: { status: 404 } });

      await expect(removeRating('track-1', 'track')).rejects.toEqual({ response: { status: 404 } });
    });
  });

  describe('getItemInteractionSummary', () => {
    it('should get full interaction summary', async () => {
      const mockSummary: ItemInteractionSummary = {
        itemId: 'track-1',
        itemType: 'track',
        userSentiment: 'like',
        userRating: 4,
        totalLikes: 100,
        totalDislikes: 5,
        averageRating: 4.2,
        totalRatings: 50,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const result = await getItemInteractionSummary('track-1', 'track');

      expect(apiClient.get).toHaveBeenCalledWith('/interactions/item/track/track-1');
      expect(result.userSentiment).toBe('like');
      expect(result.totalLikes).toBe(100);
    });

    it('should handle item with no user interaction', async () => {
      const mockSummary: ItemInteractionSummary = {
        itemId: 'track-2',
        itemType: 'track',
        userSentiment: undefined,
        userRating: undefined,
        totalLikes: 50,
        totalDislikes: 2,
        averageRating: 3.8,
        totalRatings: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const result = await getItemInteractionSummary('track-2', 'track');

      expect(result.userSentiment).toBeUndefined();
      expect(result.userRating).toBeUndefined();
    });
  });
});
