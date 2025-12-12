import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RemoveTrackFromPlaylistUseCase } from './remove-track-from-playlist.use-case';
import { Playlist } from '../../entities';
import { Track } from '@features/tracks/domain/entities/track.entity';

describe('RemoveTrackFromPlaylistUseCase', () => {
  let useCase: RemoveTrackFromPlaylistUseCase;
  let mockPlaylistRepository: {
    findById: jest.Mock;
    removeTrack: jest.Mock;
    isTrackInPlaylist: jest.Mock;
    update: jest.Mock;
  };
  let mockTrackRepository: {
    findById: jest.Mock;
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

  const createMockTrack = (overrides = {}): Track => {
    return Track.reconstruct({
      id: 'track-456',
      title: 'Test Track',
      path: '/music/test.mp3',
      duration: 180,
      discNumber: 1,
      compilation: false,
      playCount: 0,
      size: 5000000,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  beforeEach(() => {
    mockPlaylistRepository = {
      findById: jest.fn(),
      removeTrack: jest.fn(),
      isTrackInPlaylist: jest.fn(),
      update: jest.fn(),
    };

    mockTrackRepository = {
      findById: jest.fn(),
    };

    useCase = new RemoveTrackFromPlaylistUseCase(
      mockPlaylistRepository as any,
      mockTrackRepository as any,
    );
  });

  describe('execute', () => {
    it('debería eliminar un track de la playlist correctamente', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const mockTrack = createMockTrack();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockTrackRepository.findById.mockResolvedValue(mockTrack);
      mockPlaylistRepository.isTrackInPlaylist.mockResolvedValue(true);
      mockPlaylistRepository.removeTrack.mockResolvedValue(true);
      mockPlaylistRepository.update.mockResolvedValue(mockPlaylist);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        trackId: 'track-456',
        userId: 'user-123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('removed from playlist');
      expect(mockPlaylistRepository.removeTrack).toHaveBeenCalledWith('playlist-123', 'track-456');
    });

    it('debería lanzar error si playlistId está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: '',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          playlistId: '',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Playlist ID is required');
    });

    it('debería lanzar error si trackId está vacío', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: '',
          userId: 'user-123',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: '',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Track ID is required');
    });

    it('debería lanzar error si la playlist no existe', async () => {
      // Arrange
      mockPlaylistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Playlist with ID nonexistent not found');
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
          playlistId: 'playlist-123',
          trackId: 'track-456',
          userId: 'user-123', // Different from owner
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow('You do not have permission to modify this playlist');
    });

    it('debería lanzar error si el track no existe', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockTrackRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: 'nonexistent-track',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: 'nonexistent-track',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Track with ID nonexistent-track not found');
    });

    it('debería lanzar error si el track no está en la playlist', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const mockTrack = createMockTrack();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockTrackRepository.findById.mockResolvedValue(mockTrack);
      mockPlaylistRepository.isTrackInPlaylist.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Track track-456 is not in playlist playlist-123');
    });

    it('debería actualizar metadata de la playlist después de eliminar', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({
        duration: 500,
        size: 10000000,
        songCount: 5,
      });
      const mockTrack = createMockTrack({
        duration: 180,
        size: 5000000,
      });
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockTrackRepository.findById.mockResolvedValue(mockTrack);
      mockPlaylistRepository.isTrackInPlaylist.mockResolvedValue(true);
      mockPlaylistRepository.removeTrack.mockResolvedValue(true);
      mockPlaylistRepository.update.mockResolvedValue(mockPlaylist);

      // Act
      await useCase.execute({
        playlistId: 'playlist-123',
        trackId: 'track-456',
        userId: 'user-123',
      });

      // Assert
      expect(mockPlaylistRepository.update).toHaveBeenCalled();
    });

    it('debería lanzar error si removeTrack retorna false', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const mockTrack = createMockTrack();
      mockPlaylistRepository.findById.mockResolvedValue(mockPlaylist);
      mockTrackRepository.findById.mockResolvedValue(mockTrack);
      mockPlaylistRepository.isTrackInPlaylist.mockResolvedValue(true);
      mockPlaylistRepository.removeTrack.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          trackId: 'track-456',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
