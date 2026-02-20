import {
  ItemType,
  UserInteraction,
  UserRating,
  InteractionStats,
  ItemInteractionSummary,
} from './user-interaction.entity';

describe('UserInteraction types', () => {
  describe('ItemType', () => {
    it('should accept all valid ItemType values', () => {
      const types: ItemType[] = ['track', 'album', 'artist', 'playlist'];
      expect(types).toHaveLength(4);
    });

    it('should include "track" as a valid type', () => {
      const type: ItemType = 'track';
      expect(type).toBe('track');
    });

    it('should include "album" as a valid type', () => {
      const type: ItemType = 'album';
      expect(type).toBe('album');
    });

    it('should include "artist" as a valid type', () => {
      const type: ItemType = 'artist';
      expect(type).toBe('artist');
    });

    it('should include "playlist" as a valid type', () => {
      const type: ItemType = 'playlist';
      expect(type).toBe('playlist');
    });
  });

  describe('UserInteraction', () => {
    it('should create a valid UserInteraction object', () => {
      const interaction: UserInteraction = {
        userId: 'user-1',
        itemId: 'item-1',
        itemType: 'track',
        rating: 4,
        ratedAt: new Date(),
        updatedAt: new Date(),
      };

      expect(interaction.userId).toBe('user-1');
      expect(interaction.itemId).toBe('item-1');
      expect(interaction.itemType).toBe('track');
      expect(interaction.rating).toBe(4);
    });

    it('should allow optional fields to be omitted', () => {
      const interaction: UserInteraction = {
        userId: 'user-1',
        itemId: 'item-1',
        itemType: 'album',
      };

      expect(interaction.rating).toBeUndefined();
      expect(interaction.ratedAt).toBeUndefined();
      expect(interaction.updatedAt).toBeUndefined();
    });
  });

  describe('UserRating', () => {
    it('should create a valid UserRating object', () => {
      const now = new Date();
      const rating: UserRating = {
        userId: 'user-1',
        itemId: 'item-1',
        itemType: 'track',
        rating: 5,
        createdAt: now,
        updatedAt: now,
      };

      expect(rating.userId).toBe('user-1');
      expect(rating.itemId).toBe('item-1');
      expect(rating.itemType).toBe('track');
      expect(rating.rating).toBe(5);
      expect(rating.createdAt).toBe(now);
      expect(rating.updatedAt).toBe(now);
    });

    it('should accept different ItemType values', () => {
      const now = new Date();
      const rating: UserRating = {
        userId: 'user-1',
        itemId: 'item-1',
        itemType: 'playlist',
        rating: 3,
        createdAt: now,
        updatedAt: now,
      };

      expect(rating.itemType).toBe('playlist');
    });
  });

  describe('InteractionStats', () => {
    it('should create a valid InteractionStats object', () => {
      const stats: InteractionStats = {
        totalRatings: 150,
        averageRating: 4.2,
      };

      expect(stats.totalRatings).toBe(150);
      expect(stats.averageRating).toBe(4.2);
    });

    it('should handle zero ratings', () => {
      const stats: InteractionStats = {
        totalRatings: 0,
        averageRating: 0,
      };

      expect(stats.totalRatings).toBe(0);
      expect(stats.averageRating).toBe(0);
    });
  });

  describe('ItemInteractionSummary', () => {
    it('should create a valid ItemInteractionSummary object', () => {
      const summary: ItemInteractionSummary = {
        itemId: 'track-1',
        itemType: 'track',
        userRating: 4,
        averageRating: 3.8,
        totalRatings: 200,
      };

      expect(summary.itemId).toBe('track-1');
      expect(summary.itemType).toBe('track');
      expect(summary.userRating).toBe(4);
      expect(summary.averageRating).toBe(3.8);
      expect(summary.totalRatings).toBe(200);
    });

    it('should allow optional userRating to be omitted', () => {
      const summary: ItemInteractionSummary = {
        itemId: 'album-1',
        itemType: 'album',
        averageRating: 4.5,
        totalRatings: 50,
      };

      expect(summary.userRating).toBeUndefined();
    });
  });
});
