import { Test, TestingModule } from '@nestjs/testing';
import { GetUserPlaySummaryUseCase } from './get-user-play-summary.use-case';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { UserPlaySummary } from '../entities/play-event.entity';

describe('GetUserPlaySummaryUseCase', () => {
  let useCase: GetUserPlaySummaryUseCase;
  let repository: jest.Mocked<IPlayTrackingRepository>;

  const mockSummary: UserPlaySummary = {
    totalPlays: 250,
    totalSkips: 30,
    avgCompletionRate: 0.85,
    topContext: 'playlist',
    playsByContext: {
      direct: 50,
      album: 30,
      playlist: 80,
      artist: 20,
      shuffle: 15,
      radio: 10,
      recommendation: 25,
      search: 10,
      queue: 10,
    },
    recentPlays: [],
  };

  beforeEach(async () => {
    const mockRepository: Partial<IPlayTrackingRepository> = {
      getUserPlaySummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserPlaySummaryUseCase,
        {
          provide: PLAY_TRACKING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetUserPlaySummaryUseCase>(GetUserPlaySummaryUseCase);
    repository = module.get(PLAY_TRACKING_REPOSITORY);
  });

  describe('execute', () => {
    it('should return play summary with default 30 days', async () => {
      (repository.getUserPlaySummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await useCase.execute('user-1');

      expect(repository.getUserPlaySummary).toHaveBeenCalledWith('user-1', 30);
      expect(result).toEqual(mockSummary);
    });

    it('should pass custom days parameter', async () => {
      (repository.getUserPlaySummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await useCase.execute('user-1', 7);

      expect(repository.getUserPlaySummary).toHaveBeenCalledWith('user-1', 7);
      expect(result).toEqual(mockSummary);
    });

    it('should pass 90 days parameter', async () => {
      (repository.getUserPlaySummary as jest.Mock).mockResolvedValue(mockSummary);

      await useCase.execute('user-1', 90);

      expect(repository.getUserPlaySummary).toHaveBeenCalledWith('user-1', 90);
    });

    it('should return summary with zero plays', async () => {
      const emptySummary: UserPlaySummary = {
        totalPlays: 0,
        totalSkips: 0,
        avgCompletionRate: 0,
        topContext: 'direct',
        playsByContext: {
          direct: 0,
          album: 0,
          playlist: 0,
          artist: 0,
          shuffle: 0,
          radio: 0,
          recommendation: 0,
          search: 0,
          queue: 0,
        },
        recentPlays: [],
      };
      (repository.getUserPlaySummary as jest.Mock).mockResolvedValue(emptySummary);

      const result = await useCase.execute('user-new');

      expect(result.totalPlays).toBe(0);
    });

    it('should propagate repository errors', async () => {
      (repository.getUserPlaySummary as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute('user-1')).rejects.toThrow('Database error');
    });
  });
});
