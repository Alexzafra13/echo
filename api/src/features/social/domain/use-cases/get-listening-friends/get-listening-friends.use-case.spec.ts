import { Test, TestingModule } from '@nestjs/testing';
import { GetListeningFriendsUseCase } from '../get-listening-friends.use-case';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../../ports';
import { ListeningUser } from '../../entities/friendship.entity';

describe('GetListeningFriendsUseCase', () => {
  let useCase: GetListeningFriendsUseCase;
  let repository: jest.Mocked<ISocialRepository>;

  const mockListeningUsers: ListeningUser[] = [
    {
      id: 'user-2',
      username: 'friend1',
      name: 'Friend One',
      avatarPath: '/avatars/user-2.jpg',
      avatarUpdatedAt: null,
      isPlaying: true,
      currentTrack: {
        id: 'track-1',
        title: 'Now Playing Song',
        artistName: 'Some Artist',
        albumName: 'Some Album',
        albumId: 'album-1',
        coverPath: '/covers/album-1.jpg',
      },
      updatedAt: new Date('2025-01-15T10:00:00Z'),
    },
    {
      id: 'user-3',
      username: 'friend2',
      name: 'Friend Two',
      avatarPath: null,
      avatarUpdatedAt: null,
      isPlaying: true,
      currentTrack: null,
      updatedAt: new Date('2025-01-15T09:30:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockRepository: Partial<ISocialRepository> = {
      getListeningFriends: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetListeningFriendsUseCase,
        {
          provide: SOCIAL_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetListeningFriendsUseCase>(GetListeningFriendsUseCase);
    repository = module.get(SOCIAL_REPOSITORY);
  });

  describe('execute', () => {
    it('should return listening friends for a user', async () => {
      (repository.getListeningFriends as jest.Mock).mockResolvedValue(mockListeningUsers);

      const result = await useCase.execute('user-1');

      expect(repository.getListeningFriends).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockListeningUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no friends are listening', async () => {
      (repository.getListeningFriends as jest.Mock).mockResolvedValue([]);

      const result = await useCase.execute('user-1');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return friends with current track details', async () => {
      (repository.getListeningFriends as jest.Mock).mockResolvedValue([mockListeningUsers[0]]);

      const result = await useCase.execute('user-1');

      expect(result[0].currentTrack).not.toBeNull();
      expect(result[0].currentTrack!.title).toBe('Now Playing Song');
      expect(result[0].isPlaying).toBe(true);
    });

    it('should handle friends with null current track', async () => {
      (repository.getListeningFriends as jest.Mock).mockResolvedValue([mockListeningUsers[1]]);

      const result = await useCase.execute('user-1');

      expect(result[0].currentTrack).toBeNull();
    });

    it('should propagate repository errors', async () => {
      (repository.getListeningFriends as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute('user-1')).rejects.toThrow('Database error');
    });
  });
});
