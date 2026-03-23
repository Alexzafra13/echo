import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '@shared/errors';
import { InviteCollaboratorUseCase } from './invite-collaborator.use-case';
import { Playlist } from '../../entities';
import {
  PlaylistCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
} from '../../entities/playlist-collaborator.entity';
import { IPlaylistRepository } from '../../ports';
import { ICollaboratorRepository } from '../../ports';
import { IUserRepository } from '@features/auth/domain/ports/user-repository.port';

describe('InviteCollaboratorUseCase', () => {
  let useCase: InviteCollaboratorUseCase;
  let playlistRepository: jest.Mocked<IPlaylistRepository>;
  let collaboratorRepository: jest.Mocked<ICollaboratorRepository>;
  let userRepository: jest.Mocked<IUserRepository>;

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
      status: 'pending' as CollaboratorStatus,
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

    userRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new InviteCollaboratorUseCase(
      playlistRepository,
      collaboratorRepository,
      userRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should invite collaborator successfully', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const mockCollaborator = createMockCollaborator();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      userRepository.findById.mockResolvedValue({ id: 'user-456' } as any);
      collaboratorRepository.findByPlaylistAndUser.mockResolvedValue(null);
      collaboratorRepository.create.mockResolvedValue(mockCollaborator);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        targetUserId: 'user-456',
        role: 'viewer',
        inviterId: 'owner-123',
      });

      // Assert
      expect(result.id).toBe('collab-123');
      expect(result.playlistId).toBe('playlist-123');
      expect(result.userId).toBe('user-456');
      expect(result.role).toBe('viewer');
      expect(result.status).toBe('pending');
      expect(result.message).toBe('Collaboration invitation sent successfully');
      expect(collaboratorRepository.create).toHaveBeenCalled();
    });

    it('should throw ValidationError if playlistId is empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: '',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: '',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist ID is required');
    });

    it('should throw ValidationError if targetUserId is empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: '',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: '',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('Target user ID is required');
    });

    it('should throw ValidationError if role is invalid', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'admin' as any,
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'admin' as any,
          inviterId: 'owner-123',
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
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist with id nonexistent not found');
    });

    it('should throw ForbiddenError if not owner', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ ownerId: 'other-user' });
      playlistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('Only the playlist owner can invite collaborators');
    });

    it('should throw ValidationError if inviting yourself', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'owner-123',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'owner-123',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('You cannot invite yourself as a collaborator');
    });

    it('should throw NotFoundError if target user not found', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('User with id user-456 not found');
    });

    it('should throw ConflictError if already a collaborator', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const existingCollaborator = createMockCollaborator();
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      userRepository.findById.mockResolvedValue({ id: 'user-456' } as any);
      collaboratorRepository.findByPlaylistAndUser.mockResolvedValue(existingCollaborator);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow(ConflictError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          targetUserId: 'user-456',
          role: 'viewer',
          inviterId: 'owner-123',
        })
      ).rejects.toThrow('User is already a collaborator on this playlist');
    });
  });
});
