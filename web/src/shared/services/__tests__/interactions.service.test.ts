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

// Mock the api client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('interactions.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleLike', () => {
    it('should toggle like on a track', async () => {
      const mockResponse: ToggleLikeResponse = {
        liked: true,
        likedAt: new Date(),
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await toggleLike('track-1', 'track');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/like', {
        itemId: 'track-1',
        itemType: 'track',
      });
      expect(result.liked).toBe(true);
    });

    it('should toggle like off (unlike)', async () => {
      const mockResponse: ToggleLikeResponse = {
        liked: false,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await toggleLike('track-1', 'track');

      expect(result.liked).toBe(false);
      expect(result.likedAt).toBeUndefined();
    });

    it('should toggle like on an album', async () => {
      const mockResponse: ToggleLikeResponse = { liked: true };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      await toggleLike('album-1', 'album');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/like', {
        itemId: 'album-1',
        itemType: 'album',
      });
    });

    it('should toggle like on an artist', async () => {
      const mockResponse: ToggleLikeResponse = { liked: true };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      await toggleLike('artist-1', 'artist');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/like', {
        itemId: 'artist-1',
        itemType: 'artist',
      });
    });

    it('should toggle like on a playlist', async () => {
      const mockResponse: ToggleLikeResponse = { liked: true };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      await toggleLike('playlist-1', 'playlist');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/like', {
        itemId: 'playlist-1',
        itemType: 'playlist',
      });
    });

    it('should handle API error', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(toggleLike('track-1', 'track')).rejects.toThrow('Network error');
    });
  });

  describe('toggleDislike', () => {
    it('should toggle dislike on a track', async () => {
      const mockResponse: ToggleDislikeResponse = {
        disliked: true,
        dislikedAt: new Date(),
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await toggleDislike('track-1', 'track');

      expect(apiClient.post).toHaveBeenCalledWith('/interactions/dislike', {
        itemId: 'track-1',
        itemType: 'track',
      });
      expect(result.disliked).toBe(true);
    });

    it('should toggle dislike off', async () => {
      const mockResponse: ToggleDislikeResponse = {
        disliked: false,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await toggleDislike('track-1', 'track');

      expect(result.disliked).toBe(false);
    });

    it('should handle all item types', async () => {
      const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

      for (const itemType of itemTypes) {
        vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { disliked: true } });
        await toggleDislike(`${itemType}-1`, itemType);

        expect(apiClient.post).toHaveBeenCalledWith('/interactions/dislike', {
          itemId: `${itemType}-1`,
          itemType,
        });
      }
    });
  });

  describe('setRating', () => {
    it('should set a 5-star rating', async () => {
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

    it('should set a 1-star rating', async () => {
      const mockResponse: RatingResponse = {
        userId: 'user-1',
        itemId: 'album-1',
        itemType: 'album',
        rating: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await setRating('album-1', 'album', 1);

      expect(result.rating).toBe(1);
    });

    it('should update an existing rating', async () => {
      const mockResponse: RatingResponse = {
        userId: 'user-1',
        itemId: 'track-1',
        itemType: 'track',
        rating: 4,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(), // Updated timestamp
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await setRating('track-1', 'track', 4);

      expect(result.rating).toBe(4);
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle rating for all item types', async () => {
      const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

      for (const itemType of itemTypes) {
        vi.mocked(apiClient.post).mockResolvedValueOnce({
          data: {
            userId: 'user-1',
            itemId: `${itemType}-1`,
            itemType,
            rating: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await setRating(`${itemType}-1`, itemType, 3);

        expect(apiClient.post).toHaveBeenCalledWith('/interactions/rating', {
          itemId: `${itemType}-1`,
          itemType,
          rating: 3,
        });
      }
    });
  });

  describe('removeRating', () => {
    it('should remove rating from a track', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await removeRating('track-1', 'track');

      expect(apiClient.delete).toHaveBeenCalledWith('/interactions/rating/track/track-1');
    });

    it('should remove rating from an album', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await removeRating('album-1', 'album');

      expect(apiClient.delete).toHaveBeenCalledWith('/interactions/rating/album/album-1');
    });

    it('should handle remove rating for non-existent rating', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Rating not found' },
        },
      };
      vi.mocked(apiClient.delete).mockRejectedValueOnce(error);

      await expect(removeRating('track-1', 'track')).rejects.toEqual(error);
    });
  });

  describe('getItemInteractionSummary', () => {
    it('should get interaction summary for a track', async () => {
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
      expect(result.itemId).toBe('track-1');
      expect(result.userSentiment).toBe('like');
      expect(result.totalLikes).toBe(100);
    });

    it('should get summary for item with no user interaction', async () => {
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

    it('should get summary for item with dislike sentiment', async () => {
      const mockSummary: ItemInteractionSummary = {
        itemId: 'track-3',
        itemType: 'track',
        userSentiment: 'dislike',
        userRating: undefined,
        totalLikes: 10,
        totalDislikes: 20,
        averageRating: 2.5,
        totalRatings: 15,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const result = await getItemInteractionSummary('track-3', 'track');

      expect(result.userSentiment).toBe('dislike');
    });

    it('should handle all item types', async () => {
      const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

      for (const itemType of itemTypes) {
        vi.mocked(apiClient.get).mockResolvedValueOnce({
          data: {
            itemId: `${itemType}-1`,
            itemType,
            totalLikes: 10,
            totalDislikes: 1,
            averageRating: 4.0,
            totalRatings: 5,
          },
        });

        await getItemInteractionSummary(`${itemType}-1`, itemType);

        expect(apiClient.get).toHaveBeenCalledWith(`/interactions/item/${itemType}/${itemType}-1`);
      }
    });

    it('should handle not found error', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Item not found' },
        },
      };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(getItemInteractionSummary('unknown', 'track')).rejects.toEqual(error);
    });
  });
});
