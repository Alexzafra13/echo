import { GetRecentlyPlayedUseCase } from './get-recently-played.use-case';
import { IPlayTrackingRepository } from '../ports';

describe('GetRecentlyPlayedUseCase', () => {
  let useCase: GetRecentlyPlayedUseCase;
  let mockRepo: jest.Mocked<IPlayTrackingRepository>;

  beforeEach(() => {
    mockRepo = { getRecentlyPlayed: jest.fn() } as unknown as jest.Mocked<IPlayTrackingRepository>;
    useCase = new GetRecentlyPlayedUseCase(mockRepo);
  });

  it('should return recently played track ids', async () => {
    mockRepo.getRecentlyPlayed.mockResolvedValue(['track-1', 'track-2', 'track-3']);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(['track-1', 'track-2', 'track-3']);
    expect(mockRepo.getRecentlyPlayed).toHaveBeenCalledWith('user-1', 20);
  });

  it('should use default limit of 20', async () => {
    mockRepo.getRecentlyPlayed.mockResolvedValue([]);

    await useCase.execute('user-1');

    expect(mockRepo.getRecentlyPlayed).toHaveBeenCalledWith('user-1', 20);
  });

  it('should accept custom limit', async () => {
    mockRepo.getRecentlyPlayed.mockResolvedValue([]);

    await useCase.execute('user-1', 50);

    expect(mockRepo.getRecentlyPlayed).toHaveBeenCalledWith('user-1', 50);
  });

  it('should return empty array when nothing played', async () => {
    mockRepo.getRecentlyPlayed.mockResolvedValue([]);

    const result = await useCase.execute('user-1');

    expect(result).toEqual([]);
  });
});
