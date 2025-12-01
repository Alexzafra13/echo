import { ToggleDislikeUseCase } from './toggle-dislike.use-case';
import { ItemType, Sentiment, UserStarred } from '../entities/user-interaction.entity';

describe('ToggleDislikeUseCase', () => {
  let useCase: ToggleDislikeUseCase;
  let mockRepository: {
    getSentiment: jest.Mock;
    setDislike: jest.Mock;
    removeSentiment: jest.Mock;
  };

  const createMockUserStarred = (overrides = {}): UserStarred => ({
    userId: 'user-123',
    starredId: 'track-456',
    starredType: 'track' as ItemType,
    sentiment: 'dislike' as Sentiment,
    starredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      getSentiment: jest.fn(),
      setDislike: jest.fn(),
      removeSentiment: jest.fn(),
    };

    useCase = new ToggleDislikeUseCase(mockRepository as any);
  });

  describe('execute', () => {
    it('debería dar dislike a un item sin sentimiento previo', async () => {
      // Arrange
      const mockStarred = createMockUserStarred();
      mockRepository.getSentiment.mockResolvedValue(null);
      mockRepository.setDislike.mockResolvedValue(mockStarred);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track');

      // Assert
      expect(result.disliked).toBe(true);
      expect(result.data).toEqual(mockStarred);
      expect(mockRepository.getSentiment).toHaveBeenCalledWith('user-123', 'track-456', 'track');
      expect(mockRepository.setDislike).toHaveBeenCalledWith('user-123', 'track-456', 'track');
      expect(mockRepository.removeSentiment).not.toHaveBeenCalled();
    });

    it('debería quitar dislike si ya tenía dislike (toggle off)', async () => {
      // Arrange
      mockRepository.getSentiment.mockResolvedValue('dislike');
      mockRepository.removeSentiment.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track');

      // Assert
      expect(result.disliked).toBe(false);
      expect(result.data).toBeUndefined();
      expect(mockRepository.removeSentiment).toHaveBeenCalledWith('user-123', 'track-456', 'track');
      expect(mockRepository.setDislike).not.toHaveBeenCalled();
    });

    it('debería cambiar de like a dislike', async () => {
      // Arrange
      const mockStarred = createMockUserStarred();
      mockRepository.getSentiment.mockResolvedValue('like');
      mockRepository.setDislike.mockResolvedValue(mockStarred);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track');

      // Assert
      expect(result.disliked).toBe(true);
      expect(result.data).toEqual(mockStarred);
      expect(mockRepository.setDislike).toHaveBeenCalledWith('user-123', 'track-456', 'track');
    });

    it('debería funcionar con diferentes tipos de item', async () => {
      // Arrange
      const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

      for (const itemType of itemTypes) {
        const mockStarred = createMockUserStarred({ starredType: itemType });
        mockRepository.getSentiment.mockResolvedValue(null);
        mockRepository.setDislike.mockResolvedValue(mockStarred);

        // Act
        const result = await useCase.execute('user-123', 'item-123', itemType);

        // Assert
        expect(result.disliked).toBe(true);
        expect(mockRepository.setDislike).toHaveBeenLastCalledWith('user-123', 'item-123', itemType);
      }
    });

    it('debería retornar disliked: false sin data cuando se quita dislike', async () => {
      // Arrange
      mockRepository.getSentiment.mockResolvedValue('dislike');
      mockRepository.removeSentiment.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute('user-123', 'album-789', 'album');

      // Assert
      expect(result).toEqual({ disliked: false });
      expect(result.data).toBeUndefined();
    });

    it('debería retornar disliked: true con data cuando se da dislike', async () => {
      // Arrange
      const mockStarred = createMockUserStarred({
        starredId: 'artist-999',
        starredType: 'artist',
        sentiment: 'dislike',
      });
      mockRepository.getSentiment.mockResolvedValue(null);
      mockRepository.setDislike.mockResolvedValue(mockStarred);

      // Act
      const result = await useCase.execute('user-123', 'artist-999', 'artist');

      // Assert
      expect(result.disliked).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.starredId).toBe('artist-999');
      expect(result.data?.sentiment).toBe('dislike');
    });
  });
});
