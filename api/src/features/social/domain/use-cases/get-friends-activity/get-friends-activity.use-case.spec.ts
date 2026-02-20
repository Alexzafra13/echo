import { Test, TestingModule } from '@nestjs/testing';
import { GetFriendsActivityUseCase } from '../get-friends-activity.use-case';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../../ports';
import { ActivityItem } from '../../entities/friendship.entity';

describe('GetFriendsActivityUseCase', () => {
  let useCase: GetFriendsActivityUseCase;
  let repository: jest.Mocked<ISocialRepository>;

  const mockActivity: ActivityItem[] = [
    {
      id: 'activity-1',
      userId: 'user-2',
      username: 'friend1',
      userName: 'Friend One',
      userAvatarPath: '/avatars/user-2.jpg',
      userAvatarUpdatedAt: null,
      actionType: 'played_track',
      targetType: 'track',
      targetId: 'track-1',
      targetName: 'Cool Song',
      targetExtra: 'Artist Name',
      createdAt: new Date('2025-01-15T10:00:00Z'),
    },
    {
      id: 'activity-2',
      userId: 'user-3',
      username: 'friend2',
      userName: 'Friend Two',
      userAvatarPath: null,
      userAvatarUpdatedAt: null,
      actionType: 'created_playlist',
      targetType: 'playlist',
      targetId: 'playlist-1',
      targetName: 'My Playlist',
      createdAt: new Date('2025-01-15T09:00:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockRepository: Partial<ISocialRepository> = {
      getFriendsActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFriendsActivityUseCase,
        {
          provide: SOCIAL_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetFriendsActivityUseCase>(GetFriendsActivityUseCase);
    repository = module.get(SOCIAL_REPOSITORY);
  });

  describe('execute', () => {
    it('should return friends activity with default limit of 20', async () => {
      (repository.getFriendsActivity as jest.Mock).mockResolvedValue(mockActivity);

      const result = await useCase.execute('user-1');

      expect(repository.getFriendsActivity).toHaveBeenCalledWith('user-1', 20);
      expect(result).toEqual(mockActivity);
      expect(result).toHaveLength(2);
    });

    it('should pass custom limit parameter', async () => {
      (repository.getFriendsActivity as jest.Mock).mockResolvedValue([mockActivity[0]]);

      const result = await useCase.execute('user-1', 5);

      expect(repository.getFriendsActivity).toHaveBeenCalledWith('user-1', 5);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no activity found', async () => {
      (repository.getFriendsActivity as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute('user-lonely');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should propagate repository errors', async () => {
      (repository.getFriendsActivity as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute('user-1')).rejects.toThrow('Database error');
    });
  });
});
