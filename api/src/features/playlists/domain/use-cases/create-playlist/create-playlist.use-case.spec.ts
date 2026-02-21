import { ValidationError } from '@shared/errors';
import { CreatePlaylistUseCase } from './create-playlist.use-case';
import { IPlaylistRepository } from '../../ports';
import { Playlist } from '../../entities';

describe('CreatePlaylistUseCase', () => {
  let useCase: CreatePlaylistUseCase;
  let playlistRepository: jest.Mocked<IPlaylistRepository>;

  // Factory para crear mock de playlist con valores por defecto
  const createMockPlaylist = (overrides = {}): Playlist => {
    return Playlist.fromPrimitives({
      id: 'playlist-123',
      name: 'Test Playlist',
      description: undefined,
      coverImageUrl: undefined,
      duration: 0,
      size: Number(0),
      ownerId: 'user-123',
      public: false,
      songCount: 0,
      path: undefined,
      sync: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  beforeEach(() => {
    playlistRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      findPublic: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      getPlaylistTracks: jest.fn(),
      reorderTracks: jest.fn(),
    } as unknown as jest.Mocked<IPlaylistRepository>;

    useCase = new CreatePlaylistUseCase(playlistRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a new playlist successfully', async () => {
      // Arrange
      const input = {
        name: 'My Playlist',
        description: 'Test playlist',
        ownerId: 'user-123',
        public: false,
      };

      const mockPlaylist = createMockPlaylist({
        name: 'My Playlist',
        description: 'Test playlist',
      });

      playlistRepository.create.mockResolvedValue(mockPlaylist);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.create).toHaveBeenCalledTimes(1);
      expect(playlistRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Playlist',
          description: 'Test playlist',
          ownerId: 'user-123',
          public: false,
        })
      );
      expect(result.id).toBe('playlist-123');
      expect(result.name).toBe('My Playlist');
      expect(result.ownerId).toBe('user-123');
    });

    it('should create a public playlist', async () => {
      // Arrange
      const input = {
        name: 'Public Playlist',
        ownerId: 'user-123',
        public: true,
      };

      const mockPlaylist = createMockPlaylist({
        name: 'Public Playlist',
        public: true,
      });

      playlistRepository.create.mockResolvedValue(mockPlaylist);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.public).toBe(true);
    });

    it('should default to private playlist if public not specified', async () => {
      // Arrange
      const input = {
        name: 'Default Playlist',
        ownerId: 'user-123',
      };

      const mockPlaylist = createMockPlaylist({
        name: 'Default Playlist',
        public: false,
      });

      playlistRepository.create.mockResolvedValue(mockPlaylist);

      // Act
      await useCase.execute(input);

      // Assert
      expect(playlistRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          public: false,
        })
      );
    });

    it('should trim whitespace from name', async () => {
      // Arrange
      const input = {
        name: '  Playlist with spaces  ',
        ownerId: 'user-123',
        public: false,
      };

      const mockPlaylist = createMockPlaylist({
        name: 'Playlist with spaces',
      });

      playlistRepository.create.mockResolvedValue(mockPlaylist);

      // Act
      await useCase.execute(input);

      // Assert
      expect(playlistRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Playlist with spaces',
        })
      );
    });

    it('should throw error if name is empty', async () => {
      // Arrange
      const input = {
        name: '',
        ownerId: 'user-123',
        public: false,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Playlist name is required')
      );
      expect(playlistRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if name is only whitespace', async () => {
      // Arrange
      const input = {
        name: '   ',
        ownerId: 'user-123',
        public: false,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      expect(playlistRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if ownerId is empty', async () => {
      // Arrange
      const input = {
        name: 'Test Playlist',
        ownerId: '',
        public: false,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Owner ID is required')
      );
      expect(playlistRepository.create).not.toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      // Arrange
      const input = {
        name: 'Minimal Playlist',
        ownerId: 'user-123',
        description: undefined,
        coverImageUrl: undefined,
        path: undefined,
        public: false,
      };

      const mockPlaylist = createMockPlaylist({
        name: 'Minimal Playlist',
      });

      playlistRepository.create.mockResolvedValue(mockPlaylist);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.description).toBeUndefined();
      expect(result.coverImageUrl).toBeUndefined();
      expect(result.path).toBeUndefined();
    });

    it('should initialize playlist with zero tracks and duration', async () => {
      // Arrange
      const input = {
        name: 'New Playlist',
        ownerId: 'user-123',
        public: false,
      };

      const mockPlaylist = createMockPlaylist({
        name: 'New Playlist',
      });

      playlistRepository.create.mockResolvedValue(mockPlaylist);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.songCount).toBe(0);
      expect(result.duration).toBe(0);
      expect(result.size).toBe(Number(0));
    });
  });
});
