import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { UpdateCollaboratorRoleUseCase } from './update-collaborator-role.use-case';
import { Playlist } from '../../entities';
import {
  PlaylistCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
} from '../../entities/playlist-collaborator.entity';
import { IPlaylistRepository } from '../../ports';
import { ICollaboratorRepository } from '../../ports';

describe('UpdateCollaboratorRoleUseCase', () => {
  let useCase: UpdateCollaboratorRoleUseCase;
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

  const createMockCollaborator = (overrides = {}): PlaylistCollaborator => {
    return PlaylistCollaborator.fromPrimitives({
      id: 'collab-123',
      playlistId: 'playlist-123',
      userId: 'user-456',
      role: 'viewer' as CollaboratorRole,
      status: 'accepted' as CollaboratorStatus,
      invitedBy: 'owner-123',
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

    useCase = new UpdateCollaboratorRoleUseCase(playlistRepository, collaboratorRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update role successfully', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const mockCollaborator = createMockCollaborator();
      const updatedCollaborator = createMockCollaborator({ role: 'editor' });
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.findByPlaylistAndUser.mockResolvedValue(mockCollaborator);
      collaboratorRepository.updateRole.mockResolvedValue(updatedCollaborator);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        targetUserId: 'user-456',
        role: 'editor',
        requesterId: 'owner-123',
      });

      // Assert
      expect(result.id).toBe('collab-123');
      expect(result.userId).toBe('user-456');
      expect(result.role).toBe('editor');
      expect(result.message).toBe('Collaborator role updated successfully');
      expect(collaboratorRepository.updateRole).toHaveBeenCalledWith('collab-123', 'editor');
    });

    it('should throw ValidationError if playlistId empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: '',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: '',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist ID is required');
    });

    it('should throw ValidationError if role invalid', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'admin' as any,
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'admin' as any,
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Role must be editor or viewer');
    });

    it('should throw NotFoundError if playlist not found', async () => {
      // Arrange
      playlistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist with id nonexistent not found');
    });

    it('should throw ForbiddenError if not owner', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ ownerId: 'other-owner' });
      playlistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Only the playlist owner can change collaborator roles');
    });

    it('should throw NotFoundError if collaborator not found', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.findByPlaylistAndUser.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'editor',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Collaborator with id user-456 not found');
    });
  });
});
