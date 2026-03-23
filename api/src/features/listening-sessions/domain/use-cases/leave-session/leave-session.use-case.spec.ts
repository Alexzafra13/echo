import { ValidationError, NotFoundError } from '@shared/errors';
import { LeaveSessionUseCase } from './leave-session.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession } from '../../entities';

describe('LeaveSessionUseCase', () => {
  let useCase: LeaveSessionUseCase;
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

    useCase = new LeaveSessionUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should leave a session successfully as non-host', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'user-456' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.removeParticipant.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.removeParticipant).toHaveBeenCalledWith('session-123', 'user-456');
      expect(sessionRepository.end).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Left listening session successfully');
    });

    it('should end session when host leaves', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'host-123' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.end.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.end).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.removeParticipant).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Session ended because the host left');
    });

    it('should throw ValidationError when sessionId is empty', async () => {
      // Arrange
      const input = { sessionId: '', userId: 'user-456' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Session ID is required')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      const input = { sessionId: 'session-999', userId: 'user-456' };

      sessionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundError('Session', 'session-999')
      );
      expect(sessionRepository.removeParticipant).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when participant not found', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'user-999' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.removeParticipant.mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundError('Participant', 'user-999')
      );
    });
  });
});
