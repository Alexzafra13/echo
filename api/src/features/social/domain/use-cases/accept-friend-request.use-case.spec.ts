import { AcceptFriendRequestUseCase } from './accept-friend-request.use-case';
import { ISocialRepository } from '../ports';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { Friendship } from '../entities/friendship.entity';

describe('AcceptFriendRequestUseCase', () => {
  let useCase: AcceptFriendRequestUseCase;
  let mockSocialRepo: jest.Mocked<ISocialRepository>;

  const now = new Date();

  const pendingFriendship: Friendship = {
    id: 'friendship-123',
    requesterId: 'user-1',
    addresseeId: 'user-2',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockSocialRepo = {
      getFriendshipById: jest.fn(),
      acceptFriendRequest: jest.fn(),
    } as any;

    useCase = new AcceptFriendRequestUseCase(mockSocialRepo);
  });

  describe('execute', () => {
    it('should accept pending friend request as addressee', async () => {
      const acceptedFriendship: Friendship = {
        ...pendingFriendship,
        status: 'accepted',
        updatedAt: new Date(),
      };

      mockSocialRepo.getFriendshipById.mockResolvedValue(pendingFriendship);
      mockSocialRepo.acceptFriendRequest.mockResolvedValue(acceptedFriendship);

      const result = await useCase.execute('friendship-123', 'user-2');

      expect(mockSocialRepo.getFriendshipById).toHaveBeenCalledWith('friendship-123');
      expect(mockSocialRepo.acceptFriendRequest).toHaveBeenCalledWith('friendship-123', 'user-2');
      expect(result.status).toBe('accepted');
    });

    it('should throw NotFoundError when friendship not found', async () => {
      mockSocialRepo.getFriendshipById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', 'user-2')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user is not addressee', async () => {
      mockSocialRepo.getFriendshipById.mockResolvedValue(pendingFriendship);

      // user-1 is the requester, not the addressee
      await expect(useCase.execute('friendship-123', 'user-1')).rejects.toThrow(ForbiddenError);
      await expect(useCase.execute('friendship-123', 'user-1')).rejects.toThrow(
        'You cannot accept this friend request',
      );
    });

    it('should throw ForbiddenError when trying to accept random user', async () => {
      mockSocialRepo.getFriendshipById.mockResolvedValue(pendingFriendship);

      // user-3 is not involved at all
      await expect(useCase.execute('friendship-123', 'user-3')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when friendship is already accepted', async () => {
      const acceptedFriendship: Friendship = {
        ...pendingFriendship,
        status: 'accepted',
      };
      mockSocialRepo.getFriendshipById.mockResolvedValue(acceptedFriendship);

      await expect(useCase.execute('friendship-123', 'user-2')).rejects.toThrow(ForbiddenError);
      await expect(useCase.execute('friendship-123', 'user-2')).rejects.toThrow(
        'This friend request cannot be accepted',
      );
    });

    it('should throw ForbiddenError when friendship is blocked', async () => {
      const blockedFriendship: Friendship = {
        ...pendingFriendship,
        status: 'blocked',
      };
      mockSocialRepo.getFriendshipById.mockResolvedValue(blockedFriendship);

      await expect(useCase.execute('friendship-123', 'user-2')).rejects.toThrow(ForbiddenError);
    });
  });
});
