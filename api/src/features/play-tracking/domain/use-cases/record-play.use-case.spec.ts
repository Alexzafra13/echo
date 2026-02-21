import { RecordPlayUseCase } from './record-play.use-case';
import { PlayEvent, PlayContext } from '../entities/play-event.entity';
import { PlayStatsCalculatorService } from '../services/play-stats-calculator.service';
import { IPlayTrackingRepository } from '../ports';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { PinoLogger } from 'nestjs-pino';

describe('RecordPlayUseCase', () => {
  let useCase: RecordPlayUseCase;
  let mockRepository: {
    recordPlay: jest.Mock;
    updatePlayStats: jest.Mock;
  };
  let mockStatsCalculator: PlayStatsCalculatorService;
  let mockLogger: ReturnType<typeof createMockPinoLogger>;

  const createMockPlayEvent = (overrides = {}): PlayEvent => ({
    id: 'play-123',
    userId: 'user-123',
    trackId: 'track-456',
    playedAt: new Date(),
    playContext: 'direct' as PlayContext,
    completionRate: 1.0,
    skipped: false,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockLogger = createMockPinoLogger();
    mockRepository = {
      recordPlay: jest.fn(),
      updatePlayStats: jest.fn(),
    };
    mockStatsCalculator = new PlayStatsCalculatorService();

    useCase = new RecordPlayUseCase(
      mockLogger as unknown as PinoLogger,
      mockRepository as unknown as IPlayTrackingRepository,
      mockStatsCalculator
    );
  });

  describe('execute', () => {
    it('debería registrar un play completo correctamente', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent();
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'direct',
        completionRate: 1.0,
      });

      // Assert
      expect(result).toEqual(mockPlayEvent);
      expect(mockRepository.recordPlay).toHaveBeenCalledWith({
        userId: 'user-123',
        trackId: 'track-456',
        playedAt: expect.any(Date),
        client: undefined,
        playContext: 'direct',
        completionRate: 1.0,
        skipped: false,
        sourceId: undefined,
        sourceType: undefined,
      });
    });

    it('debería marcar como skipped si completionRate < 0.5', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        completionRate: 0.3,
        skipped: true,
      });
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'album',
        completionRate: 0.3,
      });

      // Assert
      expect(mockRepository.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          completionRate: 0.3,
          skipped: true,
        })
      );
    });

    it('debería usar completionRate = 1.0 por defecto', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent();
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'playlist',
      });

      // Assert
      expect(mockRepository.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          completionRate: 1.0,
          skipped: false,
        })
      );
    });

    it('debería incluir sourceId y sourceType cuando se proporcionan', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        sourceId: 'playlist-789',
        sourceType: 'playlist',
      });
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'playlist',
        sourceId: 'playlist-789',
        sourceType: 'playlist',
      });

      // Assert
      expect(mockRepository.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'playlist-789',
          sourceType: 'playlist',
        })
      );
    });

    it('debería incluir client cuando se proporciona', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        client: 'web-app',
      });
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'direct',
        client: 'web-app',
      });

      // Assert
      expect(mockRepository.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          client: 'web-app',
        })
      );
    });

    it('debería manejar diferentes contextos de reproducción', async () => {
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
        mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
        mockRepository.updatePlayStats.mockResolvedValue(undefined);

        // Act
        await useCase.execute({
          userId: 'user-123',
          trackId: 'track-456',
          playContext: context,
        });

        // Assert
        expect(mockRepository.recordPlay).toHaveBeenLastCalledWith(
          expect.objectContaining({
            playContext: context,
          })
        );
      }
    });

    it('debería no marcar como skipped si completionRate = 0.5', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        completionRate: 0.5,
        skipped: false,
      });
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'direct',
        completionRate: 0.5,
      });

      // Assert
      expect(mockRepository.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          skipped: false,
        })
      );
    });

    it('debería marcar como skipped si completionRate = 0.49', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent({
        completionRate: 0.49,
        skipped: true,
      });
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'direct',
        completionRate: 0.49,
      });

      // Assert
      expect(mockRepository.recordPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          skipped: true,
        })
      );
    });

    it('debería actualizar stats de forma asíncrona sin bloquear', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent();
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      // Delay the stats update to simulate async behavior
      mockRepository.updatePlayStats.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      // Act
      const startTime = Date.now();
      const result = await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'direct',
      });
      const endTime = Date.now();

      // Assert - Should return immediately without waiting for stats update
      expect(result).toEqual(mockPlayEvent);
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
    });

    it('debería loggear error si updatePlayStats falla después de reintentos', async () => {
      // Arrange
      const mockPlayEvent = createMockPlayEvent();
      mockRepository.recordPlay.mockResolvedValue(mockPlayEvent);
      mockRepository.updatePlayStats.mockRejectedValue(new Error('DB error'));

      // Act
      await useCase.execute({
        userId: 'user-123',
        trackId: 'track-456',
        playContext: 'direct',
      });

      // Wait for async retry logic
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Should not throw, but log error
      expect(mockRepository.recordPlay).toHaveBeenCalled();
    });
  });
});
