import { ValidationError, NotFoundError, ForbiddenError } from '@shared/errors';
import { GetSessionUseCase } from './get-session.use-case';
import { IListeningSessionRepository, ParticipantWithUser, QueueItemWithTrack } from '../../ports';
import { ListeningSession, SessionParticipantProps, ParticipantRole } from '../../entities';

describe('GetSessionUseCase', () => {
  let useCase: GetSessionUseCase;
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

  const mockParticipantsWithUser: ParticipantWithUser[] = [
    {
      id: 'p-1',
      sessionId: 'session-123',
      userId: 'host-123',
      username: 'hostuser',
      name: 'Host User',
      hasAvatar: false,
      role: 'host',
      joinedAt: new Date(),
    },
  ];

  const mockQueueItems: QueueItemWithTrack[] = [];

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

    useCase = new GetSessionUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should get session successfully by id', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'user-123' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(createMockParticipant());
      sessionRepository.getParticipants.mockResolvedValue(mockParticipantsWithUser);
      sessionRepository.getQueue.mockResolvedValue(mockQueueItems);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.findByInviteCode).not.toHaveBeenCalled();
      expect(result.id).toBe('session-123');
      expect(result.name).toBe('Test Session');
      expect(result.hostId).toBe('host-123');
      expect(result.inviteCode).toBe('ABC123');
      expect(result.participants).toEqual(mockParticipantsWithUser);
      expect(result.queue).toEqual(mockQueueItems);
    });

    it('should get session successfully by invite code', async () => {
      // Arrange
      const input = { inviteCode: 'abc123', userId: 'user-123' };
      const mockSession = createMockSession();

      sessionRepository.findByInviteCode.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(createMockParticipant());
      sessionRepository.getParticipants.mockResolvedValue(mockParticipantsWithUser);
      sessionRepository.getQueue.mockResolvedValue(mockQueueItems);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findByInviteCode).toHaveBeenCalledWith('ABC123');
      expect(sessionRepository.findById).not.toHaveBeenCalled();
      expect(result.id).toBe('session-123');
    });

    it('should throw ValidationError when no id or invite code provided', async () => {
      // Arrange
      const input = { userId: 'user-123' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Session ID or invite code is required')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      const input = { sessionId: 'nonexistent', userId: 'user-123' };

      sessionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      expect(sessionRepository.getParticipant).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a participant', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'outsider' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError('You are not a participant in this session')
      );
      expect(sessionRepository.getParticipants).not.toHaveBeenCalled();
    });
  });
});
