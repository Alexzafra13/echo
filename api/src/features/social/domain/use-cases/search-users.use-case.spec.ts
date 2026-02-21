import { SearchUsersUseCase } from './search-users.use-case';
import { ISocialRepository } from '../ports';

describe('SearchUsersUseCase', () => {
  let useCase: SearchUsersUseCase;
  let mockRepo: jest.Mocked<ISocialRepository>;

  beforeEach(() => {
    mockRepo = { searchUsers: jest.fn() } as unknown as jest.Mocked<ISocialRepository>;
    useCase = new SearchUsersUseCase(mockRepo);
  });

  it('should search users and return results', async () => {
    const mockResults = [
      { id: 'user-2', username: 'johndoe', name: 'John', avatarPath: null, friendshipStatus: null },
    ];
    mockRepo.searchUsers.mockResolvedValue(
      mockResults as Awaited<ReturnType<ISocialRepository['searchUsers']>>
    );

    const result = await useCase.execute('john', 'user-1');

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('johndoe');
    expect(mockRepo.searchUsers).toHaveBeenCalledWith('john', 'user-1', 10);
  });

  it('should return empty array for empty query', async () => {
    const result = await useCase.execute('', 'user-1');

    expect(result).toEqual([]);
    expect(mockRepo.searchUsers).not.toHaveBeenCalled();
  });

  it('should return empty array for query shorter than 2 chars', async () => {
    const result = await useCase.execute('j', 'user-1');

    expect(result).toEqual([]);
    expect(mockRepo.searchUsers).not.toHaveBeenCalled();
  });

  it('should trim the query', async () => {
    mockRepo.searchUsers.mockResolvedValue([]);

    await useCase.execute('  john  ', 'user-1');

    expect(mockRepo.searchUsers).toHaveBeenCalledWith('john', 'user-1', 10);
  });

  it('should accept custom limit', async () => {
    mockRepo.searchUsers.mockResolvedValue([]);

    await useCase.execute('john', 'user-1', 5);

    expect(mockRepo.searchUsers).toHaveBeenCalledWith('john', 'user-1', 5);
  });

  it('should use default limit of 10', async () => {
    mockRepo.searchUsers.mockResolvedValue([]);

    await useCase.execute('john', 'user-1');

    expect(mockRepo.searchUsers).toHaveBeenCalledWith('john', 'user-1', 10);
  });
});
