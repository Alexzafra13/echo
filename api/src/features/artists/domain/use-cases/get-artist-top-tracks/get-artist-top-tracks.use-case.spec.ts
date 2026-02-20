import { Test, TestingModule } from '@nestjs/testing';
import { GetArtistTopTracksUseCase } from './get-artist-top-tracks.use-case';
import {
  PLAY_TRACKING_REPOSITORY,
  IPlayTrackingRepository,
} from '@features/play-tracking/domain/ports';

describe('GetArtistTopTracksUseCase', () => {
  let useCase: GetArtistTopTracksUseCase;
  let repository: jest.Mocked<IPlayTrackingRepository>;

  const mockTopTracks = [
    {
      trackId: 'track-1',
      title: 'Hit Song',
      albumId: 'album-1',
      albumName: 'Greatest Hits',
      duration: 240,
      playCount: 500,
      uniqueListeners: 120,
    },
    {
      trackId: 'track-2',
      title: 'Another Hit',
      albumId: 'album-2',
      albumName: 'B-Sides',
      duration: 180,
      playCount: 300,
      uniqueListeners: 80,
    },
  ];

  beforeEach(async () => {
    const mockRepository: Partial<IPlayTrackingRepository> = {
      getArtistTopTracks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetArtistTopTracksUseCase,
        {
          provide: PLAY_TRACKING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetArtistTopTracksUseCase>(GetArtistTopTracksUseCase);
    repository = module.get(PLAY_TRACKING_REPOSITORY);
  });

  describe('execute', () => {
    it('should return top tracks for an artist with default limit', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue(mockTopTracks);

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 10, undefined);
      expect(result.data).toEqual(mockTopTracks);
      expect(result.artistId).toBe('artist-1');
      expect(result.limit).toBe(10);
      expect(result.days).toBeUndefined();
    });

    it('should use provided limit within valid range', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue(mockTopTracks);

      const result = await useCase.execute({ artistId: 'artist-1', limit: 25 });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 25, undefined);
      expect(result.limit).toBe(25);
    });

    it('should use default limit of 10 when limit is 0 (falsy)', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({ artistId: 'artist-1', limit: 0 });

      // 0 is falsy, so `input.limit || 10` evaluates to 10, then clamped to [1, 50]
      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 10, undefined);
      expect(result.limit).toBe(10);
    });

    it('should clamp negative limit to 1', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({ artistId: 'artist-1', limit: -5 });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 1, undefined);
      expect(result.limit).toBe(1);
    });

    it('should clamp limit to maximum of 50', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({ artistId: 'artist-1', limit: 100 });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 50, undefined);
      expect(result.limit).toBe(50);
    });

    it('should pass days when positive', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue(mockTopTracks);

      const result = await useCase.execute({ artistId: 'artist-1', days: 30 });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 10, 30);
      expect(result.days).toBe(30);
    });

    it('should pass undefined days when days is 0', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue(mockTopTracks);

      const result = await useCase.execute({ artistId: 'artist-1', days: 0 });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 10, undefined);
      expect(result.days).toBeUndefined();
    });

    it('should pass undefined days when days is negative', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue(mockTopTracks);

      const result = await useCase.execute({ artistId: 'artist-1', days: -10 });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 10, undefined);
      expect(result.days).toBeUndefined();
    });

    it('should pass undefined days when days is not provided', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue(mockTopTracks);

      const result = await useCase.execute({ artistId: 'artist-1' });

      expect(repository.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 10, undefined);
      expect(result.days).toBeUndefined();
    });

    it('should return empty data array when no top tracks found', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute({ artistId: 'artist-unknown' });

      expect(result.data).toEqual([]);
      expect(result.artistId).toBe('artist-unknown');
    });

    it('should propagate repository errors', async () => {
      (repository.getArtistTopTracks as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute({ artistId: 'artist-1' })).rejects.toThrow('Database error');
    });
  });
});
