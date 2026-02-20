import { Test, TestingModule } from '@nestjs/testing';
import { GetArtistStatsUseCase } from './get-artist-stats.use-case';
import {
  PLAY_TRACKING_REPOSITORY,
  IPlayTrackingRepository,
} from '@features/play-tracking/domain/ports';

describe('GetArtistStatsUseCase', () => {
  let useCase: GetArtistStatsUseCase;
  let repository: jest.Mocked<IPlayTrackingRepository>;

  beforeEach(async () => {
    const mockRepository: Partial<IPlayTrackingRepository> = {
      getArtistGlobalStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetArtistStatsUseCase,
        {
          provide: PLAY_TRACKING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetArtistStatsUseCase>(GetArtistStatsUseCase);
    repository = module.get(PLAY_TRACKING_REPOSITORY);
  });

  describe('execute', () => {
    it('should return artist stats with rounded values', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockResolvedValue({
        totalPlays: 1500,
        uniqueListeners: 320,
        avgCompletionRate: 0.8567,
        skipRate: 0.1234,
      });

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(repository.getArtistGlobalStats).toHaveBeenCalledWith('artist-1');
      expect(result).toEqual({
        artistId: 'artist-1',
        totalPlays: 1500,
        uniqueListeners: 320,
        avgCompletionRate: 0.86,
        skipRate: 0.12,
      });
    });

    it('should round avgCompletionRate to 2 decimal places', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockResolvedValue({
        totalPlays: 100,
        uniqueListeners: 50,
        avgCompletionRate: 0.7777,
        skipRate: 0.1,
      });

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(result.avgCompletionRate).toBe(0.78);
    });

    it('should round skipRate to 2 decimal places', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockResolvedValue({
        totalPlays: 100,
        uniqueListeners: 50,
        avgCompletionRate: 0.9,
        skipRate: 0.3333,
      });

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(result.skipRate).toBe(0.33);
    });

    it('should handle zero values correctly', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockResolvedValue({
        totalPlays: 0,
        uniqueListeners: 0,
        avgCompletionRate: 0,
        skipRate: 0,
      });

      const result = await useCase.execute({ artistId: 'artist-new' });

      expect(result).toEqual({
        artistId: 'artist-new',
        totalPlays: 0,
        uniqueListeners: 0,
        avgCompletionRate: 0,
        skipRate: 0,
      });
    });

    it('should handle perfect completion rate', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockResolvedValue({
        totalPlays: 200,
        uniqueListeners: 100,
        avgCompletionRate: 1.0,
        skipRate: 0.0,
      });

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(result.avgCompletionRate).toBe(1);
      expect(result.skipRate).toBe(0);
    });

    it('should preserve the artistId from input', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockResolvedValue({
        totalPlays: 10,
        uniqueListeners: 5,
        avgCompletionRate: 0.5,
        skipRate: 0.2,
      });

      const result = await useCase.execute({ artistId: 'specific-artist-id' });

      expect(result.artistId).toBe('specific-artist-id');
    });

    it('should propagate repository errors', async () => {
      (repository.getArtistGlobalStats as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute({ artistId: 'artist-1' })).rejects.toThrow('Database error');
    });
  });
});
