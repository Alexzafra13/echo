import { GetUserInteractionsUseCase } from './get-user-interactions.use-case';
import { IUserInteractionsRepository } from '../ports';

describe('GetUserInteractionsUseCase', () => {
  let useCase: GetUserInteractionsUseCase;
  let mockRepo: jest.Mocked<IUserInteractionsRepository>;

  beforeEach(() => {
    mockRepo = {
      getUserInteractions: jest.fn(),
    } as unknown as jest.Mocked<IUserInteractionsRepository>;
    useCase = new GetUserInteractionsUseCase(mockRepo);
  });

  it('should return user interactions', async () => {
    const interactions = [
      { userId: 'user-1', itemId: 'track-1', itemType: 'track' as const, rating: 5 },
    ];
    mockRepo.getUserInteractions.mockResolvedValue(interactions);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(interactions);
    expect(mockRepo.getUserInteractions).toHaveBeenCalledWith('user-1', undefined);
  });

  it('should filter by item type when provided', async () => {
    mockRepo.getUserInteractions.mockResolvedValue([]);

    await useCase.execute('user-1', 'album');

    expect(mockRepo.getUserInteractions).toHaveBeenCalledWith('user-1', 'album');
  });

  it('should return empty array when no interactions', async () => {
    mockRepo.getUserInteractions.mockResolvedValue([]);

    const result = await useCase.execute('user-1');

    expect(result).toEqual([]);
  });
});
