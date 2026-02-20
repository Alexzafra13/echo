import { UserInteractionsMapper } from './user-interactions.mapper';

describe('UserInteractionsMapper', () => {
  const mockDbRating = {
    userId: 'user-1',
    itemId: 'track-1',
    itemType: 'track',
    rating: 5,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-15'),
  };

  describe('toUserRatingDomain', () => {
    it('should convert DB rating to domain UserRating', () => {
      const rating = UserInteractionsMapper.toUserRatingDomain(mockDbRating as any);

      expect(rating.userId).toBe('user-1');
      expect(rating.itemId).toBe('track-1');
      expect(rating.itemType).toBe('track');
      expect(rating.rating).toBe(5);
      expect(rating.createdAt).toEqual(new Date('2024-06-01'));
      expect(rating.updatedAt).toEqual(new Date('2024-06-15'));
    });

    it('should handle different item types', () => {
      const albumRating = UserInteractionsMapper.toUserRatingDomain({
        ...mockDbRating,
        itemId: 'album-1',
        itemType: 'album',
        rating: 4,
      } as any);

      expect(albumRating.itemType).toBe('album');
      expect(albumRating.rating).toBe(4);
    });
  });

  describe('toUserRatingDomainArray', () => {
    it('should convert array of DB ratings', () => {
      const ratings = UserInteractionsMapper.toUserRatingDomainArray([
        mockDbRating,
        { ...mockDbRating, itemId: 'track-2', rating: 3 },
      ] as any);

      expect(ratings).toHaveLength(2);
      expect(ratings[0].rating).toBe(5);
      expect(ratings[1].rating).toBe(3);
    });

    it('should handle empty array', () => {
      expect(UserInteractionsMapper.toUserRatingDomainArray([])).toEqual([]);
    });
  });
});
