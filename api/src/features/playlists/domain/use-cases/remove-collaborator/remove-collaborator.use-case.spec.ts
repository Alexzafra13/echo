import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { RemoveCollaboratorUseCase } from './remove-collaborator.use-case';
import { Playlist } from '../../entities';
import { IPlaylistRepository } from '../../ports';
import { ICollaboratorRepository } from '../../ports';

describe('RemoveCollaboratorUseCase', () => {
  let useCase: RemoveCollaboratorUseCase;
  let playlistRepository: jest.Mocked<IPlaylistRepository>;
  let collaboratorRepository: jest.Mocked<ICollaboratorRepository>;

  const createMockPlaylist = (overrides = {}): Playlist => {
    return Playlist.fromPrimitives({
      id: 'playlist-123',
      name: 'Test Playlist',
      duration: 0,
      size: Number(0),
      ownerId: 'owner-123',
      public: false,
      songCount: 0,
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
      isTrackInPlaylist: jest.fn(),
      addTrackWithAutoOrder: jest.fn(),
    } as unknown as jest.Mocked<IPlaylistRepository>;

    collaboratorRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPlaylistAndUser: jest.fn(),
      findByPlaylistId: jest.fn(),
      findByUserId: jest.fn(),
      updateStatus: jest.fn(),
      updateRole: jest.fn(),
      delete: jest.fn(),
      deleteByPlaylistAndUser: jest.fn(),
      isCollaborator: jest.fn(),
      isEditor: jest.fn(),
      hasAccess: jest.fn(),
    } as unknown as jest.Mocked<ICollaboratorRepository>;

    useCase = new RemoveCollaboratorUseCase(playlistRepository, collaboratorRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should remove collaborator as owner', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.deleteByPlaylistAndUser.mockResolvedValue(true);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        targetUserId: 'user-456',
        requesterId: 'owner-123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Collaborator removed successfully');
      expect(collaboratorRepository.deleteByPlaylistAndUser).toHaveBeenCalledWith(
        'playlist-123',
        'user-456'
      );
    });

    it('should remove self as collaborator', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ ownerId: 'other-owner' });
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.deleteByPlaylistAndUser.mockResolvedValue(true);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        targetUserId: 'user-456',
        requesterId: 'user-456',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Collaborator removed successfully');
    });

    it('should throw ValidationError if playlistId empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: '',
          targetUserId: 'user-456',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: '',
          targetUserId: 'user-456',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist ID is required');
    });

    it('should throw ValidationError if targetUserId empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: '',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: '',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Target user ID is required');
    });

    it('should throw NotFoundError if playlist not found', async () => {
      // Arrange
      playlistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          targetUserId: 'user-456',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          targetUserId: 'user-456',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist with id nonexistent not found');
    });

    it('should throw ForbiddenError if not owner and not self', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ ownerId: 'other-owner' });
      playlistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          requesterId: 'stranger-789',
        })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          requesterId: 'stranger-789',
        })
      ).rejects.toThrow('Only the owner or the collaborator themselves can remove collaboration');
    });

    it('should throw NotFoundError if collaborator not found', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.deleteByPlaylistAndUser.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Collaborator with id user-456 not found');
    });
  });
});
