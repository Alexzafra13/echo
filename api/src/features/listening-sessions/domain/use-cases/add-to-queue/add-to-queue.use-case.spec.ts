import { ValidationError, NotFoundError, ForbiddenError } from '@shared/errors';
import { AddToQueueUseCase } from './add-to-queue.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { ListeningSession, SessionParticipantProps, ParticipantRole } from '../../entities';

describe('AddToQueueUseCase', () => {
  let useCase: AddToQueueUseCase;
  let sessionRepository: jest.Mocked<IListeningSessionRepository>;
  let trackRepository: jest.Mocked<ITrackRepository>;

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

    trackRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      findByAlbumId: jest.fn(),
      findByArtistId: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      countByAlbumId: jest.fn(),
      findShuffledPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ITrackRepository>;

    useCase = new AddToQueueUseCase(sessionRepository, trackRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should add to queue successfully as host', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: 'track-1', userId: 'host-123' };
      const mockSession = createMockSession();
      const mockQueueItem = {
        id: 'queue-1',
        sessionId: 'session-123',
        trackId: 'track-1',
        addedBy: 'host-123',
        position: 1,
        played: false,
        createdAt: new Date(),
      };

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'host-123', role: 'host' })
      );
      trackRepository.findById.mockResolvedValue({ id: 'track-1' } as any);
      sessionRepository.addToQueue.mockResolvedValue(mockQueueItem);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.getParticipant).toHaveBeenCalledWith('session-123', 'host-123');
      expect(trackRepository.findById).toHaveBeenCalledWith('track-1');
      expect(sessionRepository.addToQueue).toHaveBeenCalledWith(
        'session-123',
        'track-1',
        'host-123'
      );
      expect(result.sessionId).toBe('session-123');
      expect(result.trackId).toBe('track-1');
      expect(result.position).toBe(1);
      expect(result.addedBy).toBe('host-123');
      expect(result.message).toBe('Track added to queue successfully');
    });

    it('should add to queue successfully as dj', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: 'track-1', userId: 'dj-123' };
      const mockSession = createMockSession();
      const mockQueueItem = {
        id: 'queue-1',
        sessionId: 'session-123',
        trackId: 'track-1',
        addedBy: 'dj-123',
        position: 2,
        played: false,
        createdAt: new Date(),
      };

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'dj-123', role: 'dj' })
      );
      trackRepository.findById.mockResolvedValue({ id: 'track-1' } as any);
      sessionRepository.addToQueue.mockResolvedValue(mockQueueItem);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.addedBy).toBe('dj-123');
      expect(result.position).toBe(2);
      expect(result.message).toBe('Track added to queue successfully');
    });

    it('should throw ValidationError when sessionId is empty', async () => {
      // Arrange
      const input = { sessionId: '', trackId: 'track-1', userId: 'host-123' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Session ID is required')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trackId is empty', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: '', userId: 'host-123' };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('Track ID is required')
      );
      expect(sessionRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when session not found', async () => {
      // Arrange
      const input = { sessionId: 'session-999', trackId: 'track-1', userId: 'host-123' };

      sessionRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new NotFoundError('Session', 'session-999')
      );
      expect(sessionRepository.getParticipant).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when session has ended', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: 'track-1', userId: 'host-123' };
      const inactiveSession = createMockSession({ isActive: false });

      sessionRepository.findById.mockResolvedValue(inactiveSession);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ValidationError('This listening session has ended')
      );
      expect(sessionRepository.getParticipant).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not a participant', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: 'track-1', userId: 'user-999' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError('You are not a participant in this session')
      );
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when listener tries to add to queue', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: 'track-1', userId: 'user-123' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ role: 'listener' })
      );

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError(
          'Listeners cannot add tracks to the queue. Ask the host to promote you to DJ.'
        )
      );
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when track not found', async () => {
      // Arrange
      const input = { sessionId: 'session-123', trackId: 'track-999', userId: 'host-123' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'host-123', role: 'host' })
      );
      trackRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(new NotFoundError('Track', 'track-999'));
      expect(sessionRepository.addToQueue).not.toHaveBeenCalled();
    });
  });
});
