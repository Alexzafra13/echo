import { RemoveRatingUseCase } from './remove-rating.use-case';
import { IUserInteractionsRepository } from '../ports';

describe('RemoveRatingUseCase', () => {
  let useCase: RemoveRatingUseCase;
  let mockRepo: jest.Mocked<IUserInteractionsRepository>;

  beforeEach(() => {
    mockRepo = { removeRating: jest.fn() } as any;
    useCase = new RemoveRatingUseCase(mockRepo);
  });

  it('should call removeRating with correct params', async () => {
    await useCase.execute('user-1', 'track-1', 'track');

    expect(mockRepo.removeRating).toHaveBeenCalledWith('user-1', 'track-1', 'track');
  });

  it('should work for different item types', async () => {
    await useCase.execute('user-1', 'album-1', 'album');
    expect(mockRepo.removeRating).toHaveBeenCalledWith('user-1', 'album-1', 'album');

    await useCase.execute('user-1', 'artist-1', 'artist');
    expect(mockRepo.removeRating).toHaveBeenCalledWith('user-1', 'artist-1', 'artist');
  });

  it('should propagate repository errors', async () => {
    mockRepo.removeRating.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute('user-1', 'track-1', 'track')).rejects.toThrow('DB error');
  });
});
