import { ValidationError, ConflictError } from '@shared/errors';
import { CreateSessionUseCase } from './create-session.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession } from '../../entities';

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;
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

    useCase = new CreateSessionUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a session successfully', async () => {
      // Arrange
      const input = { hostId: 'host-123', name: 'My Session' };
      const mockSession = createMockSession({ name: 'My Session' });

      sessionRepository.findActiveByHostId.mockResolvedValue(null);
      sessionRepository.create.mockResolvedValue(mockSession);
      sessionRepository.addParticipant.mockResolvedValue({
        id: 'participant-1',
        sessionId: 'session-123',
        userId: 'host-123',
        role: 'host',
        joinedAt: new Date(),
      });

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findActiveByHostId).toHaveBeenCalledWith('host-123');
      expect(sessionRepository.create).toHaveBeenCalledTimes(1);
      expect(sessionRepository.addParticipant).toHaveBeenCalledWith(
        'session-123',
        'host-123',
        'host'
      );
      expect(result.id).toBe('session-123');
      expect(result.name).toBe('My Session');
      expect(result.hostId).toBe('host-123');
      expect(result.inviteCode).toBe('ABC123');
      expect(result.isActive).toBe(true);
      expect(result.message).toBe('Listening session created successfully');
    });

    it('should throw ValidationError when name is empty', async () => {
      // Arrange
      const input = { hostId: 'host-123', name: '' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Session name is required')
      );
      expect(sessionRepository.findActiveByHostId).not.toHaveBeenCalled();
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when user already has an active session', async () => {
      // Arrange
      const input = { hostId: 'host-123', name: 'New Session' };
      const existingSession = createMockSession();

      sessionRepository.findActiveByHostId.mockResolvedValue(existingSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ConflictError('You already have an active listening session')
      );
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });
  });
});
