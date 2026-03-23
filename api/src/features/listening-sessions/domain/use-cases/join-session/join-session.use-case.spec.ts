import { ValidationError, NotFoundError, ConflictError } from '@shared/errors';
import { JoinSessionUseCase } from './join-session.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession, SessionParticipantProps, ParticipantRole } from '../../entities';

describe('JoinSessionUseCase', () => {
  let useCase: JoinSessionUseCase;
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

    useCase = new JoinSessionUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should join a session successfully', async () => {
      // Arrange
      const input = { inviteCode: 'ABC123', userId: 'user-456' };
      const mockSession = createMockSession();

      sessionRepository.findByInviteCode.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(null);
      sessionRepository.addParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'user-456' })
      );

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findByInviteCode).toHaveBeenCalledWith('ABC123');
      expect(sessionRepository.getParticipant).toHaveBeenCalledWith('session-123', 'user-456');
      expect(sessionRepository.addParticipant).toHaveBeenCalledWith(
        'session-123',
        'user-456',
        'listener'
      );
      expect(result.sessionId).toBe('session-123');
      expect(result.sessionName).toBe('Test Session');
      expect(result.hostId).toBe('host-123');
      expect(result.role).toBe('listener');
      expect(result.message).toBe('Joined listening session successfully');
    });

    it('should throw ValidationError when invite code is empty', async () => {
      // Arrange
      const input = { inviteCode: '', userId: 'user-456' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Invite code is required')
      );
      expect(sessionRepository.findByInviteCode).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      const input = { inviteCode: 'INVALID', userId: 'user-456' };

      sessionRepository.findByInviteCode.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      expect(sessionRepository.addParticipant).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when session has ended', async () => {
      // Arrange
      const input = { inviteCode: 'ABC123', userId: 'user-456' };
      const inactiveSession = createMockSession({ isActive: false });

      sessionRepository.findByInviteCode.mockResolvedValue(inactiveSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('This listening session has ended')
      );
      expect(sessionRepository.addParticipant).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when already a participant', async () => {
      // Arrange
      const input = { inviteCode: 'ABC123', userId: 'user-456' };
      const mockSession = createMockSession();

      sessionRepository.findByInviteCode.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'user-456' })
      );

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictError('You are already in this session')
      );
      expect(sessionRepository.addParticipant).not.toHaveBeenCalled();
    });
  });
});
