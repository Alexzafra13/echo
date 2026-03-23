import { ValidationError, NotFoundError, ForbiddenError } from '@shared/errors';
import { EndSessionUseCase } from './end-session.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession } from '../../entities';

describe('EndSessionUseCase', () => {
  let useCase: EndSessionUseCase;
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

    useCase = new EndSessionUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should end a session successfully', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'host-123' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.end.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.end).toHaveBeenCalledWith('session-123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Listening session ended successfully');
    });

    it('should throw ValidationError when sessionId is empty', async () => {
      // Arrange
      const input = { sessionId: '', userId: 'host-123' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Session ID is required')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      const input = { sessionId: 'session-999', userId: 'host-123' };

      sessionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundError('Session', 'session-999')
      );
      expect(sessionRepository.end).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when session has already ended', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'host-123' };
      const inactiveSession = createMockSession({ isActive: false });

      sessionRepository.findById.mockResolvedValue(inactiveSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('This listening session has already ended')
      );
      expect(sessionRepository.end).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not the host', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'user-456' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError('Only the host can end the session')
      );
      expect(sessionRepository.end).not.toHaveBeenCalled();
    });
  });
});
