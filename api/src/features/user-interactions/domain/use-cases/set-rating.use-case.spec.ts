import { ValidationError } from '@shared/errors';
import { SetRatingUseCase } from './set-rating.use-case';
import { ItemType, UserRating } from '../entities/user-interaction.entity';

describe('SetRatingUseCase', () => {
  let useCase: SetRatingUseCase;
  let mockRepository: {
    setRating: jest.Mock;
  };

  const createMockUserRating = (overrides = {}): UserRating => ({
    userId: 'user-123',
    itemId: 'track-456',
    itemType: 'track' as ItemType,
    rating: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      setRating: jest.fn(),
    };

    useCase = new SetRatingUseCase(mockRepository as any);
  });

  describe('execute', () => {
    it('debería establecer un rating de 5 estrellas', async () => {
      // Arrange
      const mockRating = createMockUserRating({ rating: 5 });
      mockRepository.setRating.mockResolvedValue(mockRating);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track', 5);

      // Assert
      expect(result).toEqual(mockRating);
      expect(mockRepository.setRating).toHaveBeenCalledWith('user-123', 'track-456', 'track', 5);
    });

    it('debería establecer un rating de 1 estrella', async () => {
      // Arrange
      const mockRating = createMockUserRating({ rating: 1 });
      mockRepository.setRating.mockResolvedValue(mockRating);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 'track', 1);

      // Assert
      expect(result.rating).toBe(1);
      expect(mockRepository.setRating).toHaveBeenCalledWith('user-123', 'track-456', 'track', 1);
    });

    it('debería aceptar ratings de 1 a 5', async () => {
      // Arrange
      for (let rating = 1; rating <= 5; rating++) {
        const mockRating = createMockUserRating({ rating });
        mockRepository.setRating.mockResolvedValue(mockRating);

        // Act
        const result = await useCase.execute('user-123', 'track-456', 'track', rating);

        // Assert
        expect(result.rating).toBe(rating);
      }
    });

    it('debería lanzar error si rating es menor a 1', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 0),
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 0),
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      expect(mockRepository.setRating).not.toHaveBeenCalled();
    });

    it('debería lanzar error si rating es mayor a 5', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 6),
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 6),
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      expect(mockRepository.setRating).not.toHaveBeenCalled();
    });

    it('debería lanzar error si rating es negativo', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', -1),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.setRating).not.toHaveBeenCalled();
    });

    it('debería lanzar error si rating no es entero', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 3.5),
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 3.5),
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      expect(mockRepository.setRating).not.toHaveBeenCalled();
    });

    it('debería lanzar error si rating es 0', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 0),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.setRating).not.toHaveBeenCalled();
    });

    it('debería funcionar con diferentes tipos de item', async () => {
      // Arrange
      const itemTypes: ItemType[] = ['track', 'album', 'artist', 'playlist'];

      for (const itemType of itemTypes) {
        const mockRating = createMockUserRating({ itemType, rating: 4 });
        mockRepository.setRating.mockResolvedValue(mockRating);

        // Act
        const result = await useCase.execute('user-123', 'item-123', itemType, 4);

        // Assert
        expect(result.itemType).toBe(itemType);
        expect(mockRepository.setRating).toHaveBeenLastCalledWith('user-123', 'item-123', itemType, 4);
      }
    });

    it('debería permitir actualizar un rating existente', async () => {
      // Arrange
      const mockRating = createMockUserRating({ rating: 3 });
      mockRepository.setRating.mockResolvedValue(mockRating);

      // Act
      const result = await useCase.execute('user-123', 'album-789', 'album', 3);

      // Assert
      expect(result.rating).toBe(3);
      expect(mockRepository.setRating).toHaveBeenCalledWith('user-123', 'album-789', 'album', 3);
    });

    it('debería rechazar rating de 2.9 (no es entero)', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 2.9),
      ).rejects.toThrow(ValidationError);
    });

    it('debería rechazar rating de 4.1 (no es entero)', async () => {
      // Act & Assert
      await expect(
        useCase.execute('user-123', 'track-456', 'track', 4.1),
      ).rejects.toThrow(ValidationError);
    });
  });
});
