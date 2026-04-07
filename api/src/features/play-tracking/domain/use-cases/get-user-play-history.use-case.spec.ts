import { Test, TestingModule } from '@nestjs/testing';
import { GetUserPlayHistoryUseCase } from './get-user-play-history.use-case';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { PlayEvent } from '../entities/play-event.entity';

describe('GetUserPlayHistoryUseCase', () => {
  let useCase: GetUserPlayHistoryUseCase;
  let repository: jest.Mocked<IPlayTrackingRepository>;

  const mockPlayEvents: PlayEvent[] = [
    {
      id: 'event-1',
      userId: 'user-1',
      trackId: 'track-1',
      playedAt: new Date('2025-01-15T10:00:00Z'),
      playContext: 'direct',
      skipped: false,
      completionRate: 0.95,
      createdAt: new Date('2025-01-15T10:00:00Z'),
    },
    {
      id: 'event-2',
      userId: 'user-1',
      trackId: 'track-2',
      playedAt: new Date('2025-01-15T10:05:00Z'),
      playContext: 'playlist',
      skipped: true,
      completionRate: 0.3,
      createdAt: new Date('2025-01-15T10:05:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockRepository: Partial<IPlayTrackingRepository> = {
      getUserPlayHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserPlayHistoryUseCase,
        {
          provide: PLAY_TRACKING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetUserPlayHistoryUseCase>(GetUserPlayHistoryUseCase);
    repository = module.get(PLAY_TRACKING_REPOSITORY);
  });

  describe('execute', () => {
    it('should return play history for a user', async () => {
      (repository.getUserPlayHistory as jest.Mock).mockResolvedValue(mockPlayEvents);

      const result = await useCase.execute('user-1');

      expect(repository.getUserPlayHistory).toHaveBeenCalledWith('user-1', undefined, undefined);
      expect(result).toEqual(mockPlayEvents);
      expect(result).toHaveLength(2);
    });

    it('should pass limit parameter to repository', async () => {
      (repository.getUserPlayHistory as jest.Mock).mockResolvedValue([mockPlayEvents[0]]);

      const result = await useCase.execute('user-1', 1);

      expect(repository.getUserPlayHistory).toHaveBeenCalledWith('user-1', 1, undefined);
      expect(result).toHaveLength(1);
    });

    it('should pass limit and offset parameters to repository', async () => {
      (repository.getUserPlayHistory as jest.Mock).mockResolvedValue(mockPlayEvents);

      const result = await useCase.execute('user-1', 10, 20);

      expect(repository.getUserPlayHistory).toHaveBeenCalledWith('user-1', 10, 20);
      expect(result).toEqual(mockPlayEvents);
    });

    it('should return empty array when user has no play history', async () => {
      (repository.getUserPlayHistory as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute('user-no-history');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should propagate repository errors', async () => {
      (repository.getUserPlayHistory as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute('user-1')).rejects.toThrow('Database connection failed');
    });
  });
});
