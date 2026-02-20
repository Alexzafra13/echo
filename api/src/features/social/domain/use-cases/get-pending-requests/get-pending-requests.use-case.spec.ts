import { Test, TestingModule } from '@nestjs/testing';
import { GetPendingRequestsUseCase } from '../get-pending-requests.use-case';
import { ISocialRepository, SOCIAL_REPOSITORY } from '../../ports';
import { Friend } from '../../entities/friendship.entity';

describe('GetPendingRequestsUseCase', () => {
  let useCase: GetPendingRequestsUseCase;
  let repository: jest.Mocked<ISocialRepository>;

  const mockReceivedRequests: Friend[] = [
    {
      id: 'user-2',
      username: 'requester1',
      name: 'Requester One',
      avatarPath: '/avatars/user-2.jpg',
      avatarUpdatedAt: null,
      isPublicProfile: true,
      friendshipId: 'friendship-1',
      friendsSince: new Date('2025-01-10'),
    },
  ];

  const mockSentRequests: Friend[] = [
    {
      id: 'user-3',
      username: 'target1',
      name: 'Target One',
      avatarPath: null,
      avatarUpdatedAt: null,
      isPublicProfile: false,
      friendshipId: 'friendship-2',
      friendsSince: new Date('2025-01-12'),
    },
    {
      id: 'user-4',
      username: 'target2',
      name: 'Target Two',
      avatarPath: null,
      avatarUpdatedAt: null,
      isPublicProfile: true,
      friendshipId: 'friendship-3',
      friendsSince: new Date('2025-01-14'),
    },
  ];

  beforeEach(async () => {
    const mockRepository: Partial<ISocialRepository> = {
      getPendingRequests: jest.fn(),
      getSentRequests: jest.fn(),
      countPendingRequests: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPendingRequestsUseCase,
        {
          provide: SOCIAL_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetPendingRequestsUseCase>(GetPendingRequestsUseCase);
    repository = module.get(SOCIAL_REPOSITORY);
  });

  describe('execute', () => {
    it('should return received requests, sent requests, and count', async () => {
      (repository.getPendingRequests as jest.Mock).mockResolvedValue(mockReceivedRequests);
      (repository.getSentRequests as jest.Mock).mockResolvedValue(mockSentRequests);
      (repository.countPendingRequests as jest.Mock).mockResolvedValue(1);

      const result = await useCase.execute('user-1');

      expect(repository.getPendingRequests).toHaveBeenCalledWith('user-1');
      expect(repository.getSentRequests).toHaveBeenCalledWith('user-1');
      expect(repository.countPendingRequests).toHaveBeenCalledWith('user-1');
      expect(result.received).toEqual(mockReceivedRequests);
      expect(result.sent).toEqual(mockSentRequests);
      expect(result.count).toBe(1);
    });

    it('should call all three repository methods in parallel', async () => {
      const callOrder: string[] = [];

      (repository.getPendingRequests as jest.Mock).mockImplementation(async () => {
        callOrder.push('getPendingRequests');
        return mockReceivedRequests;
      });
      (repository.getSentRequests as jest.Mock).mockImplementation(async () => {
        callOrder.push('getSentRequests');
        return mockSentRequests;
      });
      (repository.countPendingRequests as jest.Mock).mockImplementation(async () => {
        callOrder.push('countPendingRequests');
        return 1;
      });

      await useCase.execute('user-1');

      expect(callOrder).toHaveLength(3);
      expect(callOrder).toContain('getPendingRequests');
      expect(callOrder).toContain('getSentRequests');
      expect(callOrder).toContain('countPendingRequests');
    });

    it('should return empty arrays when no pending requests exist', async () => {
      (repository.getPendingRequests as jest.Mock).mockResolvedValue([]);
      (repository.getSentRequests as jest.Mock).mockResolvedValue([]);
      (repository.countPendingRequests as jest.Mock).mockResolvedValue(0);

      const result = await useCase.execute('user-1');

      expect(result.received).toEqual([]);
      expect(result.sent).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should propagate repository errors', async () => {
      (repository.getPendingRequests as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );
      (repository.getSentRequests as jest.Mock).mockResolvedValue([]);
      (repository.countPendingRequests as jest.Mock).mockResolvedValue(0);

      await expect(useCase.execute('user-1')).rejects.toThrow('Database error');
    });
  });
});
