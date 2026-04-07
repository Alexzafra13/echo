import { RemoveFriendshipUseCase } from './remove-friendship.use-case';
import { ISocialRepository } from '../ports';
import { NotFoundError, ForbiddenError } from '@shared/errors';

describe('RemoveFriendshipUseCase', () => {
  let useCase: RemoveFriendshipUseCase;
  let mockRepo: jest.Mocked<ISocialRepository>;

  const mockFriendship = {
    id: 'friendship-1',
    requesterId: 'user-1',
    addresseeId: 'user-2',
    status: 'accepted' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      getFriendshipById: jest.fn(),
      removeFriendship: jest.fn(),
    } as unknown as jest.Mocked<ISocialRepository>;
    useCase = new RemoveFriendshipUseCase(mockRepo);
  });

  it('should remove friendship when requester removes', async () => {
    mockRepo.getFriendshipById.mockResolvedValue(mockFriendship);

    await useCase.execute('friendship-1', 'user-1');

    expect(mockRepo.removeFriendship).toHaveBeenCalledWith('friendship-1', 'user-1');
  });

  it('should remove friendship when addressee removes', async () => {
    mockRepo.getFriendshipById.mockResolvedValue(mockFriendship);

    await useCase.execute('friendship-1', 'user-2');

    expect(mockRepo.removeFriendship).toHaveBeenCalledWith('friendship-1', 'user-2');
  });

  it('should throw NotFoundError when friendship not found', async () => {
    mockRepo.getFriendshipById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', 'user-1')).rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when user is not part of friendship', async () => {
    mockRepo.getFriendshipById.mockResolvedValue(mockFriendship);

    await expect(useCase.execute('friendship-1', 'user-3')).rejects.toThrow(ForbiddenError);
  });

  it('should not call removeFriendship when forbidden', async () => {
    mockRepo.getFriendshipById.mockResolvedValue(mockFriendship);

    await expect(useCase.execute('friendship-1', 'user-3')).rejects.toThrow();

    expect(mockRepo.removeFriendship).not.toHaveBeenCalled();
  });
});
