import { ValidationError, NotFoundError, ForbiddenError } from '@shared/errors';
import { UpdateParticipantRoleUseCase } from './update-participant-role.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession, SessionParticipantProps, ParticipantRole } from '../../entities';

describe('UpdateParticipantRoleUseCase', () => {
  let useCase: UpdateParticipantRoleUseCase;
  let sessionRepository: jest.Mocked<IListeningSessionRepository>;

  const createMockSession = (overrides = {}) =>
    ListeningSession.fromPrimitives({
      id: 'session-123',
      hostId: 'host-123',
      name: 'Test Session',
      inviteCode: 'ABC123',
      isActive: true,
      currentPosition: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const createMockParticipant = (overrides = {}): SessionParticipantProps => ({
    id: 'participant-123',
    sessionId: 'session-123',
    userId: 'user-123',
    role: 'listener' as ParticipantRole,
    joinedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    sessionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByInviteCode: jest.fn(),
      findActiveByHostId: jest.fn(),
      update: jest.fn(),
      end: jest.fn(),
      addParticipant: jest.fn(),
      removeParticipant: jest.fn(),
      getParticipants: jest.fn(),
      getParticipant: jest.fn(),
      updateParticipantRole: jest.fn(),
      addToQueue: jest.fn(),
      getQueue: jest.fn(),
      markPlayed: jest.fn(),
      getNextUnplayed: jest.fn(),
      clearQueue: jest.fn(),
    } as unknown as jest.Mocked<IListeningSessionRepository>;

    useCase = new UpdateParticipantRoleUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update participant role successfully', async () => {
      // Arrange
      const input = {
        sessionId: 'session-123',
        targetUserId: 'user-456',
        role: 'dj' as ParticipantRole,
        requesterId: 'host-123',
      };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'user-456' })
      );
      sessionRepository.updateParticipantRole.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.getParticipant).toHaveBeenCalledWith('session-123', 'user-456');
      expect(sessionRepository.updateParticipantRole).toHaveBeenCalledWith(
        'session-123',
        'user-456',
        'dj'
      );
      expect(result.userId).toBe('user-456');
      expect(result.role).toBe('dj');
      expect(result.message).toBe('Participant role updated successfully');
    });

    it('should throw ValidationError when sessionId is empty', async () => {
      // Arrange
      const input = {
        sessionId: '',
        targetUserId: 'user-456',
        role: 'dj' as ParticipantRole,
        requesterId: 'host-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Session ID is required')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when role is invalid', async () => {
      // Arrange
      const input = {
        sessionId: 'session-123',
        targetUserId: 'user-456',
        role: 'admin' as ParticipantRole,
        requesterId: 'host-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Role must be dj or listener')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      const input = {
        sessionId: 'session-999',
        targetUserId: 'user-456',
        role: 'dj' as ParticipantRole,
        requesterId: 'host-123',
      };

      sessionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundError('Session', 'session-999')
      );
      expect(sessionRepository.getParticipant).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when session has ended', async () => {
      // Arrange
      const input = {
        sessionId: 'session-123',
        targetUserId: 'user-456',
        role: 'dj' as ParticipantRole,
        requesterId: 'host-123',
      };
      const inactiveSession = createMockSession({ isActive: false });

      sessionRepository.findById.mockResolvedValue(inactiveSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('This listening session has ended')
      );
      expect(sessionRepository.updateParticipantRole).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when requester is not the host', async () => {
      // Arrange
      const input = {
        sessionId: 'session-123',
        targetUserId: 'user-456',
        role: 'dj' as ParticipantRole,
        requesterId: 'user-789',
      };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError('Only the host can change participant roles')
      );
      expect(sessionRepository.updateParticipantRole).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to change host role', async () => {
      // Arrange
      const input = {
        sessionId: 'session-123',
        targetUserId: 'host-123',
        role: 'dj' as ParticipantRole,
        requesterId: 'host-123',
      };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Cannot change the host role')
      );
      expect(sessionRepository.updateParticipantRole).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when participant not found', async () => {
      // Arrange
      const input = {
        sessionId: 'session-123',
        targetUserId: 'user-999',
        role: 'dj' as ParticipantRole,
        requesterId: 'host-123',
      };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundError('Participant', 'user-999')
      );
      expect(sessionRepository.updateParticipantRole).not.toHaveBeenCalled();
    });
  });
});
