import { GetFriendsUseCase } from './get-friends.use-case';
import { ISocialRepository } from '../ports';
import { Friend } from '../entities/friendship.entity';

describe('GetFriendsUseCase', () => {
  let useCase: GetFriendsUseCase;
  let mockSocialRepo: jest.Mocked<ISocialRepository>;

  const mockFriends: Friend[] = [
    {
      id: 'user-2',
      username: 'friend1',
      name: 'Friend One',
      avatarPath: '/avatars/user-2.jpg',
      isPublicProfile: true,
      friendshipId: 'friendship-1',
      friendsSince: new Date('2024-01-15'),
    },
    {
      id: 'user-3',
      username: 'friend2',
      name: 'Friend Two',
      avatarPath: null,
      isPublicProfile: false,
      friendshipId: 'friendship-2',
      friendsSince: new Date('2024-02-20'),
    },
  ];

  beforeEach(() => {
    mockSocialRepo = {
      getFriends: jest.fn(),
    } as any;

    useCase = new GetFriendsUseCase(mockSocialRepo);
  });

  describe('execute', () => {
    it('should return list of friends for user', async () => {
      mockSocialRepo.getFriends.mockResolvedValue(mockFriends);

      const result = await useCase.execute('user-1');

      expect(mockSocialRepo.getFriends).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockFriends);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no friends', async () => {
      mockSocialRepo.getFriends.mockResolvedValue([]);

      const result = await useCase.execute('user-lonely');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return friends with all required properties', async () => {
      mockSocialRepo.getFriends.mockResolvedValue(mockFriends);

      const result = await useCase.execute('user-1');

      result.forEach((friend) => {
        expect(friend).toHaveProperty('id');
        expect(friend).toHaveProperty('username');
        expect(friend).toHaveProperty('name');
        expect(friend).toHaveProperty('avatarPath');
        expect(friend).toHaveProperty('isPublicProfile');
        expect(friend).toHaveProperty('friendshipId');
        expect(friend).toHaveProperty('friendsSince');
      });
    });

    it('should handle friends with null optional fields', async () => {
      const friendWithNulls: Friend = {
        id: 'user-4',
        username: 'minimal',
        name: null,
        avatarPath: null,
        isPublicProfile: true,
        friendshipId: 'friendship-3',
        friendsSince: new Date(),
      };
      mockSocialRepo.getFriends.mockResolvedValue([friendWithNulls]);

      const result = await useCase.execute('user-1');

      expect(result[0].name).toBeNull();
      expect(result[0].avatarPath).toBeNull();
    });

    it('should propagate errors from repository', async () => {
      const error = new Error('Database connection failed');
      mockSocialRepo.getFriends.mockRejectedValue(error);

      await expect(useCase.execute('user-1')).rejects.toThrow('Database connection failed');
    });
  });
});
