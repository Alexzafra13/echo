import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UpdatePlaylistUseCase } from './update-playlist.use-case';
import { Playlist } from '../../entities';

describe('UpdatePlaylistUseCase', () => {
  let useCase: UpdatePlaylistUseCase;
  let mockPlaylistRepository: {
    findById: jest.Mock;
    update: jest.Mock;
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
      update: jest.fn(),
    };

    useCase = new UpdatePlaylistUseCase(mockPlaylistRepository as any);
  });

  describe('execute', () => {
    it('debería actualizar el nombre de la playlist', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const updatedPlaylist = createMockPlaylist({ name: 'New Name' });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.update.mockResolvedValue(updatedPlaylist);

      // Act
      const result = await useCase.execute({
        id: 'playlist-123',
        userId: 'user-123',
        name: 'New Name',
      });

      // Assert
      expect(result.name).toBe('New Name');
      expect(mockPlaylistRepository.update).toHaveBeenCalled();
    });

    it('debería actualizar la descripción de la playlist', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const updatedPlaylist = createMockPlaylist({ description: 'New Description' });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.update.mockResolvedValue(updatedPlaylist);

      // Act
      const result = await useCase.execute({
        id: 'playlist-123',
        userId: 'user-123',
        description: 'New Description',
      });

      // Assert
      expect(result.description).toBe('New Description');
    });

    it('debería cambiar visibilidad a pública', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ public: false });
      const updatedPlaylist = createMockPlaylist({ public: true });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.update.mockResolvedValue(updatedPlaylist);

      // Act
      const result = await useCase.execute({
        id: 'playlist-123',
        userId: 'user-123',
        public: true,
      });

      // Assert
      expect(result.public).toBe(true);
    });

    it('debería lanzar error si ID está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          id: '',
          userId: 'user-123',
          name: 'New Name',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          id: '',
          userId: 'user-123',
          name: 'New Name',
        }),
      ).rejects.toThrow('Playlist ID is required');
    });

    it('debería lanzar error si playlist no existe', async () => {
      // Arrange
      mockPlaylistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'nonexistent',
          userId: 'user-123',
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
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
          name: 'New Name',
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
          name: 'New Name',
        }),
      ).rejects.toThrow('You do not have permission to modify this playlist');
    });

    it('debería lanzar error si nombre está vacío', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
          name: '',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
          name: '',
        }),
      ).rejects.toThrow('Playlist name cannot be empty');
    });

    it('debería lanzar error si nombre es solo espacios', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
          name: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería trimear el nombre', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const updatedPlaylist = createMockPlaylist({ name: 'Trimmed Name' });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.update.mockResolvedValue(updatedPlaylist);

      // Act
      await useCase.execute({
        id: 'playlist-123',
        userId: 'user-123',
        name: '  Trimmed Name  ',
      });

      // Assert
      expect(mockPlaylistRepository.update).toHaveBeenCalled();
    });

    it('debería actualizar múltiples campos a la vez', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const updatedPlaylist = createMockPlaylist({
        name: 'New Name',
        description: 'New Description',
        public: true,
      });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.update.mockResolvedValue(updatedPlaylist);

      // Act
      const result = await useCase.execute({
        id: 'playlist-123',
        userId: 'user-123',
        name: 'New Name',
        description: 'New Description',
        public: true,
      });

      // Assert
      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New Description');
      expect(result.public).toBe(true);
    });

    it('debería lanzar error si update retorna null', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockPlaylistRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          id: 'playlist-123',
          userId: 'user-123',
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
