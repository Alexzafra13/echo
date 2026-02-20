import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { JwtService } from '@nestjs/jwt';
import { SocialController } from './social.controller';
import {
  SendFriendRequestUseCase,
  AcceptFriendRequestUseCase,
  RemoveFriendshipUseCase,
  GetFriendsUseCase,
  GetPendingRequestsUseCase,
  GetListeningFriendsUseCase,
  GetFriendsActivityUseCase,
  SearchUsersUseCase,
} from '../../domain/use-cases';
import { ListeningNowService } from '../../domain/services/listening-now.service';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { SocialMapper } from '../../infrastructure/mappers/social.mapper';

describe('SocialController', () => {
  let controller: SocialController;
  let getFriendsUseCase: jest.Mocked<GetFriendsUseCase>;
  let sendFriendRequestUseCase: jest.Mocked<SendFriendRequestUseCase>;
  let acceptFriendRequestUseCase: jest.Mocked<AcceptFriendRequestUseCase>;
  let removeFriendshipUseCase: jest.Mocked<RemoveFriendshipUseCase>;
  let getPendingRequestsUseCase: jest.Mocked<GetPendingRequestsUseCase>;
  let getListeningFriendsUseCase: jest.Mocked<GetListeningFriendsUseCase>;
  let getFriendsActivityUseCase: jest.Mocked<GetFriendsActivityUseCase>;
  let searchUsersUseCase: jest.Mocked<SearchUsersUseCase>;

  const mockUser = { id: 'user-1', username: 'testuser' };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialController],
      providers: [
        { provide: GetFriendsUseCase, useValue: { execute: jest.fn() } },
        { provide: SendFriendRequestUseCase, useValue: { execute: jest.fn() } },
        { provide: AcceptFriendRequestUseCase, useValue: { execute: jest.fn() } },
        { provide: RemoveFriendshipUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPendingRequestsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetListeningFriendsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetFriendsActivityUseCase, useValue: { execute: jest.fn() } },
        { provide: SearchUsersUseCase, useValue: { execute: jest.fn() } },
        { provide: ListeningNowService, useValue: { subscribe: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: SecuritySecretsService, useValue: { jwtSecret: 'test-secret' } },
        { provide: getLoggerToken(SocialController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<SocialController>(SocialController);
    getFriendsUseCase = module.get(GetFriendsUseCase);
    sendFriendRequestUseCase = module.get(SendFriendRequestUseCase);
    acceptFriendRequestUseCase = module.get(AcceptFriendRequestUseCase);
    removeFriendshipUseCase = module.get(RemoveFriendshipUseCase);
    getPendingRequestsUseCase = module.get(GetPendingRequestsUseCase);
    getListeningFriendsUseCase = module.get(GetListeningFriendsUseCase);
    getFriendsActivityUseCase = module.get(GetFriendsActivityUseCase);
    searchUsersUseCase = module.get(SearchUsersUseCase);
  });

  describe('getSocialOverview', () => {
    it('should return the social overview with all sections', async () => {
      const mockFriend = {
        id: 'friend-1',
        friendshipId: 'fs-1',
        username: 'friend',
        displayName: 'Friend',
        avatarPath: null,
        avatarUpdatedAt: null,
        since: new Date('2025-01-01'),
      };

      getFriendsUseCase.execute.mockResolvedValue([mockFriend]);
      getPendingRequestsUseCase.execute.mockResolvedValue({
        received: [],
        sent: [],
        count: 0,
      });
      getListeningFriendsUseCase.execute.mockResolvedValue([]);
      getFriendsActivityUseCase.execute.mockResolvedValue([]);

      const req = { user: mockUser } as any;
      const result = await controller.getSocialOverview(req);

      expect(getFriendsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(getPendingRequestsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(getListeningFriendsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(getFriendsActivityUseCase.execute).toHaveBeenCalledWith('user-1', 10);
      expect(result.friends).toHaveLength(1);
      expect(result.pendingRequests.count).toBe(0);
    });
  });

  describe('getFriends', () => {
    it('should return the list of friends', async () => {
      const mockFriend = {
        id: 'friend-1',
        friendshipId: 'fs-1',
        username: 'friend',
        displayName: 'Friend',
        avatarPath: null,
        avatarUpdatedAt: null,
        since: new Date('2025-01-01'),
      };

      getFriendsUseCase.execute.mockResolvedValue([mockFriend]);

      const req = { user: mockUser } as any;
      const result = await controller.getFriends(req);

      expect(getFriendsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request and return the friendship', async () => {
      const mockFriendship = {
        id: 'fs-1',
        requesterId: 'user-1',
        addresseeId: 'user-2',
        status: 'pending' as const,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      sendFriendRequestUseCase.execute.mockResolvedValue(mockFriendship);

      const req = { user: mockUser } as any;
      const dto = { addresseeId: 'user-2' };

      const result = await controller.sendFriendRequest(req, dto as any);

      expect(sendFriendRequestUseCase.execute).toHaveBeenCalledWith('user-1', 'user-2');
      expect(result).toMatchObject({
        id: 'fs-1',
        requesterId: 'user-1',
        addresseeId: 'user-2',
        status: 'pending',
      });
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept a friend request', async () => {
      const mockFriendship = {
        id: 'fs-1',
        requesterId: 'user-2',
        addresseeId: 'user-1',
        status: 'accepted' as const,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      acceptFriendRequestUseCase.execute.mockResolvedValue(mockFriendship);

      const req = { user: mockUser } as any;
      const params = { friendshipId: 'fs-1' };

      const result = await controller.acceptFriendRequest(req, params as any);

      expect(acceptFriendRequestUseCase.execute).toHaveBeenCalledWith('fs-1', 'user-1');
      expect(result).toMatchObject({
        id: 'fs-1',
        requesterId: 'user-2',
        addresseeId: 'user-1',
        status: 'accepted',
      });
    });
  });

  describe('removeFriendship', () => {
    it('should remove a friendship and return success', async () => {
      removeFriendshipUseCase.execute.mockResolvedValue(undefined);

      const req = { user: mockUser } as any;
      const params = { friendshipId: 'fs-1' };

      const result = await controller.removeFriendship(req, params as any);

      expect(removeFriendshipUseCase.execute).toHaveBeenCalledWith('fs-1', 'user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getPendingRequests', () => {
    it('should return pending friend requests', async () => {
      getPendingRequestsUseCase.execute.mockResolvedValue({
        received: [],
        sent: [],
        count: 0,
      });

      const req = { user: mockUser } as any;
      const result = await controller.getPendingRequests(req);

      expect(getPendingRequestsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(result.count).toBe(0);
    });
  });

  describe('getListeningFriends', () => {
    it('should return friends currently listening', async () => {
      getListeningFriendsUseCase.execute.mockResolvedValue([]);

      const req = { user: mockUser } as any;
      const result = await controller.getListeningFriends(req);

      expect(getListeningFriendsUseCase.execute).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('getFriendsActivity', () => {
    it('should return friends activity feed', async () => {
      getFriendsActivityUseCase.execute.mockResolvedValue([]);

      const req = { user: mockUser } as any;
      const query = { limit: 20 };

      const result = await controller.getFriendsActivity(req, query as any);

      expect(getFriendsActivityUseCase.execute).toHaveBeenCalledWith('user-1', 20);
      expect(result).toEqual([]);
    });
  });

  describe('searchUsers', () => {
    it('should search users and return results', async () => {
      const mockSearchResult = {
        id: 'user-2',
        username: 'otheruser',
        displayName: 'Other',
        avatarPath: null,
        avatarUpdatedAt: null,
        isFriend: false,
        hasPendingRequest: false,
      };

      searchUsersUseCase.execute.mockResolvedValue([mockSearchResult]);

      const req = { user: mockUser } as any;
      const query = { q: 'other', limit: 10 };

      const result = await controller.searchUsers(req, query as any);

      expect(searchUsersUseCase.execute).toHaveBeenCalledWith('other', 'user-1', 10);
      expect(result).toHaveLength(1);
    });
  });
});
