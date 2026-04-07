import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { AcceptCollaborationUseCase } from './accept-collaboration.use-case';
import {
  PlaylistCollaborator,
  CollaboratorRole,
  CollaboratorStatus,
} from '../../entities/playlist-collaborator.entity';
import { ICollaboratorRepository } from '../../ports';

describe('AcceptCollaborationUseCase', () => {
  let useCase: AcceptCollaborationUseCase;
  let collaboratorRepository: jest.Mocked<ICollaboratorRepository>;

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

    useCase = new AcceptCollaborationUseCase(collaboratorRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should accept collaboration successfully', async () => {
      // Arrange
      const mockCollaborator = createMockCollaborator();
      const updatedCollaborator = createMockCollaborator({ status: 'accepted' });
      collaboratorRepository.findById.mockResolvedValue(mockCollaborator);
      collaboratorRepository.updateStatus.mockResolvedValue(updatedCollaborator);

      // Act
      const result = await useCase.execute({
        collaborationId: 'collab-123',
        userId: 'user-456',
      });

      // Assert
      expect(result.id).toBe('collab-123');
      expect(result.playlistId).toBe('playlist-123');
      expect(result.userId).toBe('user-456');
      expect(result.status).toBe('accepted');
      expect(result.message).toBe('Collaboration accepted successfully');
      expect(collaboratorRepository.updateStatus).toHaveBeenCalledWith('collab-123', 'accepted');
    });

    it('should throw ValidationError if collaborationId is empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          collaborationId: '',
          userId: 'user-456',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          collaborationId: '',
          userId: 'user-456',
        })
      ).rejects.toThrow('Collaboration ID is required');
    });

    it('should throw NotFoundError if collaboration not found', async () => {
      // Arrange
      collaboratorRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          collaborationId: 'nonexistent',
          userId: 'user-456',
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        useCase.execute({
          collaborationId: 'nonexistent',
          userId: 'user-456',
        })
      ).rejects.toThrow('Collaboration with id nonexistent not found');
    });

    it('should throw ForbiddenError if not the invited user', async () => {
      // Arrange
      const mockCollaborator = createMockCollaborator({ userId: 'other-user' });
      collaboratorRepository.findById.mockResolvedValue(mockCollaborator);

      // Act & Assert
      await expect(
        useCase.execute({
          collaborationId: 'collab-123',
          userId: 'user-456',
        })
      ).rejects.toThrow(ForbiddenError);
      await expect(
        useCase.execute({
          collaborationId: 'collab-123',
          userId: 'user-456',
        })
      ).rejects.toThrow('Only the invited user can accept this collaboration');
    });

    it('should throw ValidationError if already accepted', async () => {
      // Arrange
      const mockCollaborator = createMockCollaborator({ status: 'accepted' });
      collaboratorRepository.findById.mockResolvedValue(mockCollaborator);

      // Act & Assert
      await expect(
        useCase.execute({
          collaborationId: 'collab-123',
          userId: 'user-456',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          collaborationId: 'collab-123',
          userId: 'user-456',
        })
      ).rejects.toThrow('Collaboration is already accepted');
    });
  });
});
