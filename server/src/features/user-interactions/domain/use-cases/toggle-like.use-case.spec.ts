import { ToggleLikeUseCase } from './toggle-like.use-case';
import { ItemType, Sentiment, UserStarred } from '../entities/user-interaction.entity';

describe('ToggleLikeUseCase', () => {
  let useCase: ToggleLikeUseCase;
  let mockRepository: {
    getSentiment: jest.Mock;
    setLike: jest.Mock;
    removeSentiment: jest.Mock;
  };

  const createMockUserStarred = (overrides = {}): UserStarred => ({
    userId: 'user-123',
    starredId: 'track-456',
    starredType: 'track' as ItemType,
    sentiment: 'like' as Sentiment,
    starredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      getSentiment: jest.fn(),
      setLike: jest.fn(),
      removeSentiment: jest.fn(),
    };

    useCase = new ToggleLikeUseCase(mockRepository as any);
  });

  describe('execute', () => {
    it('debería dar like a un item sin sentimiento previo', async () => {
      // Arrange
      const mockStarred = createMockUserStarred();
      mockRepository.getSentiment.mockResolvedValue(null);
      mockRepository.setLike.mockResolvedValue(mockStarred);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track');

      // Assert
      expect(result.liked).toBe(true);
      expect(result.data).toEqual(mockStarred);
      expect(mockRepository.getSentiment).toHaveBeenCalledWith('user-123', 'track-456', 'track');
      expect(mockRepository.setLike).toHaveBeenCalledWith('user-123', 'track-456', 'track');
      expect(mockRepository.removeSentiment).not.toHaveBeenCalled();
    });

    it('debería quitar like si ya tenía like (toggle off)', async () => {
      // Arrange
      mockRepository.getSentiment.mockResolvedValue('like');
      mockRepository.removeSentiment.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track');

      // Assert
      expect(result.liked).toBe(false);
      expect(result.data).toBeUndefined();
      expect(mockRepository.removeSentiment).toHaveBeenCalledWith('user-123', 'track-456', 'track');
      expect(mockRepository.setLike).not.toHaveBeenCalled();
    });

    it('debería cambiar de dislike a like', async () => {
      // Arrange
      const mockStarred = createMockUserStarred();
      mockRepository.getSentiment.mockResolvedValue('dislike');
      mockRepository.setLike.mockResolvedValue(mockStarred);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track');

      // Assert
      expect(result.liked).toBe(true);
      expect(result.data).toEqual(mockStarred);
      expect(mockRepository.setLike).toHaveBeenCalledWith('user-123', 'track-456', 'track');
    });

    it('debería funcionar con diferentes tipos de item', async () => {
      // Arrange
      const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

      for (const itemType of itemTypes) {
        const mockStarred = createMockUserStarred({ starredType: itemType });
        mockRepository.getSentiment.mockResolvedValue(null);
        mockRepository.setLike.mockResolvedValue(mockStarred);

        // Act
        const result = await useCase.execute('user-123', 'item-123', itemType);

        // Assert
        expect(result.liked).toBe(true);
        expect(mockRepository.setLike).toHaveBeenLastCalledWith('user-123', 'item-123', itemType);
      }
    });

    it('debería retornar liked: false sin data cuando se quita like', async () => {
      // Arrange
      mockRepository.getSentiment.mockResolvedValue('like');
      mockRepository.removeSentiment.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute('user-123', 'album-789', 'album');

      // Assert
      expect(result).toEqual({ liked: false });
      expect(result.data).toBeUndefined();
    });

    it('debería retornar liked: true con data cuando se da like', async () => {
      // Arrange
      const mockStarred = createMockUserStarred({
        starredId: 'artist-999',
        starredType: 'artist',
      });
      mockRepository.getSentiment.mockResolvedValue(null);
      mockRepository.setLike.mockResolvedValue(mockStarred);

      // Act
      const result = await useCase.execute('user-123', 'artist-999', 'artist');

      // Assert
      expect(result.liked).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.starredId).toBe('artist-999');
    });
  });
});
