import { ValidationError } from '@shared/errors';
import { GetPlaylistsUseCase } from './get-playlists.use-case';
import { IPlaylistRepository } from '../../ports';
import { Playlist } from '../../entities';

describe('GetPlaylistsUseCase', () => {
  let useCase: GetPlaylistsUseCase;
  let playlistRepository: jest.Mocked<IPlaylistRepository>;

  const mockPlaylists = [
    Playlist.fromPrimitives({
      id: 'playlist-1',
      name: 'Playlist 1',
      description: 'Test 1',
      coverImageUrl: undefined,
      duration: 180,
      size: Number(1000000),
      ownerId: 'user-123',
      public: false,
      songCount: 3,
      path: undefined,
      sync: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    Playlist.fromPrimitives({
      id: 'playlist-2',
      name: 'Playlist 2',
      description: 'Test 2',
      coverImageUrl: undefined,
      duration: 240,
      size: Number(2000000),
      ownerId: 'user-123',
      public: true,
      songCount: 5,
      path: undefined,
      sync: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  beforeEach(() => {
    playlistRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      findByOwnerId: jest.fn(),
      findPublic: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      getPlaylistTracks: jest.fn(),
      reorderTracks: jest.fn(),
      count: jest.fn(),
      countByOwnerId: jest.fn(),
      getBatchPlaylistAlbumIds: jest.fn(),
    } as any;

    useCase = new GetPlaylistsUseCase(playlistRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should get playlists by ownerId', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: 0,
        take: 20,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue(mockPlaylists);
      playlistRepository.countByOwnerId.mockResolvedValue(2);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(
        new Map([
          ['playlist-1', ['album-1', 'album-2']],
          ['playlist-2', ['album-3']],
        ])
      );

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.findByOwnerId).toHaveBeenCalledWith('user-123', 0, 20);
      expect(playlistRepository.countByOwnerId).toHaveBeenCalledWith('user-123');
      expect(playlistRepository.getBatchPlaylistAlbumIds).toHaveBeenCalledWith(['playlist-1', 'playlist-2']);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('should get public playlists only', async () => {
      // Arrange
      const input = {
        publicOnly: true,
        skip: 0,
        take: 20,
      };

      const publicPlaylists = [mockPlaylists[1]]; // Solo la pública

      playlistRepository.findPublic.mockResolvedValue(publicPlaylists);
      playlistRepository.count.mockResolvedValue(1);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(
        new Map([['playlist-2', ['album-3']]])
      );

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.findPublic).toHaveBeenCalledWith(0, 20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].public).toBe(true);
    });

    it('should use default pagination values', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        // No skip ni take
      };

      playlistRepository.findByOwnerId.mockResolvedValue(mockPlaylists);
      playlistRepository.countByOwnerId.mockResolvedValue(2);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.findByOwnerId).toHaveBeenCalledWith('user-123', 0, 20);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('should handle custom pagination', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: 10,
        take: 5,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue([]);
      playlistRepository.countByOwnerId.mockResolvedValue(15);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.findByOwnerId).toHaveBeenCalledWith('user-123', 10, 5);
      expect(result.skip).toBe(10);
      expect(result.take).toBe(5);
    });

    it('should normalize negative skip to 0', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: -1,
        take: 20,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue([]);
      playlistRepository.countByOwnerId.mockResolvedValue(0);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.skip).toBe(0);
      expect(playlistRepository.findByOwnerId).toHaveBeenCalledWith('user-123', 0, 20);
    });

    it('should normalize take of 0 to 1', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: 0,
        take: 0,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue([]);
      playlistRepository.countByOwnerId.mockResolvedValue(0);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.take).toBe(1);
      expect(playlistRepository.findByOwnerId).toHaveBeenCalledWith('user-123', 0, 1);
    });

    it('should cap take at 100 if it exceeds maximum', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: 0,
        take: 101,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue([]);
      playlistRepository.countByOwnerId.mockResolvedValue(0);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.take).toBe(100);
      expect(playlistRepository.findByOwnerId).toHaveBeenCalledWith('user-123', 0, 100);
    });

    it('should throw error if no filter specified', async () => {
      // Arrange
      const input = {
        skip: 0,
        take: 20,
        publicOnly: false,
        // Sin ownerId ni publicOnly=true
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Must specify ownerId or publicOnly filter');
    });

    it('should map playlists to output format correctly', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: 0,
        take: 20,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue(mockPlaylists);
      playlistRepository.countByOwnerId.mockResolvedValue(2);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'playlist-1',
          name: 'Playlist 1',
          description: 'Test 1',
          ownerId: 'user-123',
          public: false,
          songCount: 3,
        }),
      );
    });

    it('should handle empty result', async () => {
      // Arrange
      const input = {
        ownerId: 'user-123',
        skip: 0,
        take: 20,
        publicOnly: false,
      };

      playlistRepository.findByOwnerId.mockResolvedValue([]);
      playlistRepository.countByOwnerId.mockResolvedValue(0);
      playlistRepository.getBatchPlaylistAlbumIds.mockResolvedValue(new Map());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
