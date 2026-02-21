import { RecordSkipUseCase } from './record-skip.use-case';
import { PlayEvent, PlayContext } from '../entities/play-event.entity';
import { IPlayTrackingRepository } from '../ports';

describe('RecordSkipUseCase', () => {
  let useCase: RecordSkipUseCase;
  let mockRepository: {
    recordSkip: jest.Mock;
  };

  const createMockPlayEvent = (overrides = {}): PlayEvent => ({
    id: 'play-123',
    userId: 'user-123',
    trackId: 'track-456',
    playedAt: new Date(),
    playContext: 'direct' as PlayContext,
    completionRate: 0.2,
    skipped: true,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      recordSkip: jest.fn(),
    };

    useCase = new RecordSkipUseCase(mockRepository as unknown as IPlayTrackingRepository);
  });

  describe('execute', () => {
    it('debería registrar un skip correctamente', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent();
      mockRepository.recordSkip.mockResolvedValue(mockPlayEvent);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 0.2, 'album');

      // Assert
      expect(result).toEqual(mockPlayEvent);
      expect(mockRepository.recordSkip).toHaveBeenCalledWith('user-123', 'track-456', 0.2, 'album');
    });

    it('debería manejar skip inmediato (completionRate = 0)', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        completionRate: 0,
      });
      mockRepository.recordSkip.mockResolvedValue(mockPlayEvent);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 0, 'shuffle');

      // Assert
      expect(result.completionRate).toBe(0);
      expect(mockRepository.recordSkip).toHaveBeenCalledWith('user-123', 'track-456', 0, 'shuffle');
    });

    it('debería funcionar con diferentes contextos', async () => {
      // Arrange
      const contexts: PlayContext[] = [
        'direct',
        'album',
        'playlist',
        'artist',
        'shuffle',
        'radio',
        'recommendation',
        'search',
        'queue',
      ];

      for (const context of contexts) {
        const mockPlayEvent = createMockPlayEvent({ playContext: context });
        mockRepository.recordSkip.mockResolvedValue(mockPlayEvent);

        // Act
        await useCase.execute('user-123', 'track-456', 0.3, context);

        // Assert
        expect(mockRepository.recordSkip).toHaveBeenLastCalledWith(
          'user-123',
          'track-456',
          0.3,
          context
        );
      }
    });

    it('debería registrar skip con baja tasa de completitud', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        completionRate: 0.1,
      });
      mockRepository.recordSkip.mockResolvedValue(mockPlayEvent);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 0.1, 'playlist');

      // Assert
      expect(result.skipped).toBe(true);
      expect(result.completionRate).toBe(0.1);
    });

    it('debería registrar skip con tasa de completitud moderada', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        completionRate: 0.4,
      });
      mockRepository.recordSkip.mockResolvedValue(mockPlayEvent);

      // Act
      const result = await useCase.execute('user-123', 'track-456', 0.4, 'radio');

      // Assert
      expect(result.completionRate).toBe(0.4);
    });

    it('debería retornar el PlayEvent del repositorio', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        id: 'unique-skip-id',
        trackId: 'specific-track',
      });
      mockRepository.recordSkip.mockResolvedValue(mockPlayEvent);

      // Act
      const result = await useCase.execute('user-123', 'specific-track', 0.25, 'direct');

      // Assert
      expect(result.id).toBe('unique-skip-id');
      expect(result.trackId).toBe('specific-track');
    });
  });
});
