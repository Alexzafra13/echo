import { ValidationError, NotFoundError, ForbiddenError } from '@shared/errors';
import { SkipTrackUseCase } from './skip-track.use-case';
import { IListeningSessionRepository, QueueItemWithTrack } from '../../ports';
import { ListeningSession, SessionParticipantProps, ParticipantRole } from '../../entities';

describe('SkipTrackUseCase', () => {
  let useCase: SkipTrackUseCase;
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

  const createMockQueueItem = (overrides = {}): QueueItemWithTrack => ({
    id: 'queue-1',
    sessionId: 'session-123',
    trackId: 'track-2',
    trackTitle: 'Next Song',
    trackDuration: 240,
    artistName: 'Test Artist',
    albumName: 'Test Album',
    albumId: 'album-1',
    addedBy: 'host-123',
    addedByUsername: 'host',
    position: 2,
    played: false,
    createdAt: new Date(),
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

    useCase = new SkipTrackUseCase(sessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should skip to next track successfully', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'host-123' };
      const mockSession = createMockSession({ currentTrackId: 'track-1' });
      const currentQueueItem = createMockQueueItem({
        trackId: 'track-1',
        position: 1,
        played: false,
      });
      const nextQueueItem = createMockQueueItem({
        trackId: 'track-2',
        trackTitle: 'Next Song',
        position: 2,
      });

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'host-123', role: 'host' })
      );
      sessionRepository.getQueue.mockResolvedValue([currentQueueItem]);
      sessionRepository.markPlayed.mockResolvedValue(true);
      sessionRepository.getNextUnplayed.mockResolvedValue(nextQueueItem);
      sessionRepository.update.mockResolvedValue(mockSession);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.getParticipant).toHaveBeenCalledWith('session-123', 'host-123');
      expect(sessionRepository.markPlayed).toHaveBeenCalledWith('session-123', 1);
      expect(sessionRepository.getNextUnplayed).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.update).toHaveBeenCalledWith('session-123', expect.any(Object));
      expect(result.sessionId).toBe('session-123');
      expect(result.nextTrackId).toBe('track-2');
      expect(result.nextTrackTitle).toBe('Next Song');
      expect(result.position).toBe(2);
      expect(result.message).toBe('Skipped to next track');
    });

    it('should return no more tracks when queue is empty', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'host-123' };
      const mockSession = createMockSession({ currentTrackId: 'track-1' });
      const currentQueueItem = createMockQueueItem({
        trackId: 'track-1',
        position: 1,
        played: false,
      });

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ userId: 'host-123', role: 'host' })
      );
      sessionRepository.getQueue.mockResolvedValue([currentQueueItem]);
      sessionRepository.markPlayed.mockResolvedValue(true);
      sessionRepository.getNextUnplayed.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(sessionRepository.getNextUnplayed).toHaveBeenCalledWith('session-123');
      expect(sessionRepository.update).not.toHaveBeenCalled();
      expect(result.sessionId).toBe('session-123');
      expect(result.nextTrackId).toBeUndefined();
      expect(result.position).toBe(0);
      expect(result.message).toBe('No more tracks in queue');
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
      expect(sessionRepository.getParticipant).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when session has ended', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'host-123' };
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
      const input = { sessionId: 'session-123', userId: 'user-999' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError('You are not a participant in this session')
      );
      expect(sessionRepository.getQueue).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when listener tries to skip', async () => {
      // Arrange
      const input = { sessionId: 'session-123', userId: 'user-123' };
      const mockSession = createMockSession();

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.getParticipant.mockResolvedValue(
        createMockParticipant({ role: 'listener' })
      );

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new ForbiddenError('Listeners cannot skip tracks')
      );
      expect(sessionRepository.getQueue).not.toHaveBeenCalled();
    });
  });
});
