import { GetUserTopTracksUseCase } from './get-user-top-tracks.use-case';
import { IPlayTrackingRepository } from '../ports';

describe('GetUserTopTracksUseCase', () => {
  let useCase: GetUserTopTracksUseCase;
  let mockRepo: jest.Mocked<IPlayTrackingRepository>;

  beforeEach(() => {
    mockRepo = { getUserTopTracks: jest.fn() } as any;
    useCase = new GetUserTopTracksUseCase(mockRepo);
  });

  it('should return top tracks', async () => {
    const topTracks = [
      { trackId: 'track-1', playCount: 100, weightedPlayCount: 85 },
      { trackId: 'track-2', playCount: 50, weightedPlayCount: 40 },
    ];
    mockRepo.getUserTopTracks.mockResolvedValue(topTracks);

    const result = await useCase.execute('user-1');

    expect(result).toHaveLength(2);
    expect(result[0].trackId).toBe('track-1');
    expect(result[0].playCount).toBe(100);
    expect(mockRepo.getUserTopTracks).toHaveBeenCalledWith('user-1', 50, undefined);
  });

  it('should accept custom limit and days', async () => {
    mockRepo.getUserTopTracks.mockResolvedValue([]);

    await useCase.execute('user-1', 10, 30);

    expect(mockRepo.getUserTopTracks).toHaveBeenCalledWith('user-1', 10, 30);
  });

  it('should default limit to 50', async () => {
    mockRepo.getUserTopTracks.mockResolvedValue([]);

    await useCase.execute('user-1');

    expect(mockRepo.getUserTopTracks).toHaveBeenCalledWith('user-1', 50, undefined);
  });
});
