import { SendFriendRequestUseCase } from './send-friend-request.use-case';
import { ISocialRepository } from '../ports';
import { ValidationError, ConflictError } from '@shared/errors';
import { Friendship } from '../entities/friendship.entity';

describe('SendFriendRequestUseCase', () => {
  let useCase: SendFriendRequestUseCase;
  let mockSocialRepo: jest.Mocked<ISocialRepository>;

  const now = new Date();

  const mockFriendship: Friendship = {
    id: 'friendship-123',
    requesterId: 'user-1',
    addresseeId: 'user-2',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockSocialRepo = {
      sendFriendRequest: jest.fn(),
      getFriendshipBetweenUsers: jest.fn(),
      acceptFriendRequest: jest.fn(),
    } as unknown as jest.Mocked<ISocialRepository>;

    useCase = new SendFriendRequestUseCase(mockSocialRepo);
  });

  describe('execute', () => {
    it('should send friend request when no existing friendship', async () => {
      mockSocialRepo.getFriendshipBetweenUsers.mockResolvedValue(null);
      mockSocialRepo.sendFriendRequest.mockResolvedValue(mockFriendship);

      const result = await useCase.execute('user-1', 'user-2');

      expect(mockSocialRepo.getFriendshipBetweenUsers).toHaveBeenCalledWith('user-1', 'user-2');
      expect(mockSocialRepo.sendFriendRequest).toHaveBeenCalledWith('user-1', 'user-2');
      expect(result).toEqual(mockFriendship);
    });

    it('should throw ValidationError when sending request to yourself', async () => {
      await expect(useCase.execute('user-1', 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute('user-1', 'user-1')).rejects.toThrow(
        'Cannot send friend request to yourself'
      );
    });

    it('should throw ConflictError when already friends', async () => {
      const existingFriendship: Friendship = {
        ...mockFriendship,
        status: 'accepted',
      };
      mockSocialRepo.getFriendshipBetweenUsers.mockResolvedValue(existingFriendship);

      await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(ConflictError);
      await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(
        'You are already friends with this user'
      );
    });

    it('should throw ConflictError when request already pending (sent by me)', async () => {
      const pendingFriendship: Friendship = {
        ...mockFriendship,
        status: 'pending',
        requesterId: 'user-1', // I sent it
        addresseeId: 'user-2',
      };
      mockSocialRepo.getFriendshipBetweenUsers.mockResolvedValue(pendingFriendship);

      await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(ConflictError);
      await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(
        'Friend request already sent'
      );
    });

    it('should auto-accept when they already sent us a request', async () => {
      const incomingRequest: Friendship = {
        ...mockFriendship,
        id: 'friendship-incoming',
        status: 'pending',
        requesterId: 'user-2', // They sent it
        addresseeId: 'user-1', // To me
      };
      const acceptedFriendship: Friendship = {
        ...incomingRequest,
        status: 'accepted',
      };

      mockSocialRepo.getFriendshipBetweenUsers.mockResolvedValue(incomingRequest);
      mockSocialRepo.acceptFriendRequest.mockResolvedValue(acceptedFriendship);

      const result = await useCase.execute('user-1', 'user-2');

      expect(mockSocialRepo.acceptFriendRequest).toHaveBeenCalledWith(
        'friendship-incoming',
        'user-1'
      );
      expect(result.status).toBe('accepted');
    });

    it('should throw ValidationError when user is blocked', async () => {
      const blockedFriendship: Friendship = {
        ...mockFriendship,
        status: 'blocked',
      };
      mockSocialRepo.getFriendshipBetweenUsers.mockResolvedValue(blockedFriendship);

      await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(ValidationError);
      await expect(useCase.execute('user-1', 'user-2')).rejects.toThrow(
        'Cannot send friend request to this user'
      );
    });
  });
});
