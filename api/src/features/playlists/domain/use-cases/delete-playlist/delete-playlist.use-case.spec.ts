import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { DeletePlaylistUseCase } from './delete-playlist.use-case';
import { Playlist } from '../../entities';

describe('DeletePlaylistUseCase', () => {
  let useCase: DeletePlaylistUseCase;
  let mockPlaylistRepository: {
    findById: jest.Mock;
    delete: jest.Mock;
  };

  const createMockPlaylist = (overrides = {}): Playlist => {
    return Playlist.fromPrimitives({
      id: 'playlist-123',
      name: 'Test Playlist',
      description: 'Test description',
      coverImageUrl: undefined,
      duration: 3600,
      size: 1024000,
      ownerId: 'user-123',
      public: false,
      songCount: 10,
      path: undefined,
      sync: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  beforeEach(() => {
    mockPlaylistRepository = {
      findById: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new DeletePlaylistUseCase(mockPlaylistRepository as any);
  });

  describe('execute', () => {
    it('debería eliminar una playlist correctamente', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.delete.mockResolvedValue(true);

      // Act
      const result = await useCase.execute({
        id: 'playlist-123',
        userId: 'user-123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
      expect(mockPlaylistRepository.findById).toHaveBeenCalledWith('playlist-123');
      expect(mockPlaylistRepository.delete).toHaveBeenCalledWith('playlist-123');
    });

    it('debería lanzar error si ID está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          id: '',
          userId: 'user-123',
        }),
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          id: '',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Playlist ID is required');
    });

    it('debería lanzar error si ID es solo espacios', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          id: '   ',
          userId: 'user-123',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('debería lanzar error si playlist no existe', async () => {
      // Arrange
      mockPlaylistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'nonexistent',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          id: 'nonexistent',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Playlist with id nonexistent not found');
    });

    it('debería lanzar error si usuario no es el propietario', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({
        ownerId: 'other-user',
      });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123', // Different from owner
        }),
      ).rejects.toThrow(ForbiddenError);
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
        }),
      ).rejects.toThrow('You do not have permission to delete this playlist');
    });

    it('debería lanzar error si delete retorna false', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.delete.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('debería permitir al propietario eliminar su playlist', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({
        ownerId: 'owner-456',
      });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.delete.mockResolvedValue(true);

      // Act
      const result = await useCase.execute({
        id: 'playlist-123',
        userId: 'owner-456', // Same as owner
      });

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
