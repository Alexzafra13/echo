import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { GetCollaboratorsUseCase } from './get-collaborators.use-case';
import { Playlist } from '../../entities';
import {
  PlaylistCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
} from '../../entities/playlist-collaborator.entity';
import { IPlaylistRepository } from '../../ports';
import { ICollaboratorRepository } from '../../ports';

describe('GetCollaboratorsUseCase', () => {
  let useCase: GetCollaboratorsUseCase;
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

    useCase = new GetCollaboratorsUseCase(playlistRepository, collaboratorRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should get collaborators as owner', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist();
      const mockCollaborators = [
        createMockCollaborator({ id: 'collab-1', userId: 'user-1' }),
        createMockCollaborator({ id: 'collab-2', userId: 'user-2' }),
      ];
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.findByPlaylistId.mockResolvedValue(mockCollaborators);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        requesterId: 'owner-123',
      });

      // Assert
      expect(result.playlistId).toBe('playlist-123');
      expect(result.collaborators).toHaveLength(2);
      expect(playlistRepository.findById).toHaveBeenCalledWith('playlist-123');
      expect(collaboratorRepository.findByPlaylistId).toHaveBeenCalledWith('playlist-123');
    });

    it('should get collaborators as collaborator', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ ownerId: 'other-owner' });
      const mockCollaborators = [createMockCollaborator()];
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.hasAccess.mockResolvedValue(true);
      collaboratorRepository.findByPlaylistId.mockResolvedValue(mockCollaborators);

      // Act
      const result = await useCase.execute({
        playlistId: 'playlist-123',
        requesterId: 'user-456',
      });

      // Assert
      expect(result.playlistId).toBe('playlist-123');
      expect(result.collaborators).toHaveLength(1);
      expect(collaboratorRepository.hasAccess).toHaveBeenCalledWith('playlist-123', 'user-456');
    });

    it('should throw ValidationError if playlistId empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: '',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          playlistId: '',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist ID is required');
    });

    it('should throw NotFoundError if playlist not found', async () => {
      // Arrange
      playlistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          playlistId: 'nonexistent',
          requesterId: 'owner-123',
        })
      ).rejects.toThrow('Playlist with id nonexistent not found');
    });

    it('should throw ForbiddenError if not owner or collaborator', async () => {
      // Arrange
      const mockPlaylist = createMockPlaylist({ ownerId: 'other-owner' });
      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      collaboratorRepository.hasAccess.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          requesterId: 'stranger-789',
        })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        useCase.execute({
          playlistId: 'playlist-123',
          requesterId: 'stranger-789',
        })
      ).rejects.toThrow('You do not have access to view collaborators');
    });
  });
});
