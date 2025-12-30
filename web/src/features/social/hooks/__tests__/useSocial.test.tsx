import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import * as socialService from '../../services/social.service';
import {
  useSocialOverview,
  useFriends,
  usePendingRequests,
  useListeningFriends,
  useFriendsActivity,
  useSearchUsers,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriendship,
  socialKeys,
} from '../useSocial';

vi.mock('../../services/social.service');

describe('useSocial hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const mockFriend: socialService.Friend = {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: null,
    isPublicProfile: true,
    friendshipId: 'friendship-1',
    friendsSince: '2024-01-01T00:00:00Z',
  };

  const mockOverview: socialService.SocialOverview = {
    friends: [mockFriend],
    pendingRequests: { received: [], sent: [], count: 0 },
    listeningNow: [],
    recentActivity: [],
  };

  describe('socialKeys', () => {
    it('should generate correct query keys', () => {
      expect(socialKeys.all).toEqual(['social']);
      expect(socialKeys.overview()).toEqual(['social', 'overview']);
      expect(socialKeys.friends()).toEqual(['social', 'friends']);
      expect(socialKeys.pendingRequests()).toEqual(['social', 'pending']);
      expect(socialKeys.listening()).toEqual(['social', 'listening']);
      expect(socialKeys.activity(10)).toEqual(['social', 'activity', 10]);
      expect(socialKeys.search('test')).toEqual(['social', 'search', 'test']);
    });
  });

  describe('useSocialOverview', () => {
    it('should fetch social overview', async () => {
      vi.mocked(socialService.getSocialOverview).mockResolvedValueOnce(mockOverview);

      const { result } = renderHook(() => useSocialOverview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockOverview);
      expect(socialService.getSocialOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe('useFriends', () => {
    it('should fetch friends', async () => {
      vi.mocked(socialService.getFriends).mockResolvedValueOnce([mockFriend]);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([mockFriend]);
    });
  });

  describe('usePendingRequests', () => {
    it('should fetch pending requests', async () => {
      const mockPending: socialService.PendingRequests = {
        received: [mockFriend],
        sent: [],
        count: 1,
      };
      vi.mocked(socialService.getPendingRequests).mockResolvedValueOnce(mockPending);

      const { result } = renderHook(() => usePendingRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPending);
    });
  });

  describe('useListeningFriends', () => {
    it('should fetch listening friends', async () => {
      const mockListening: socialService.ListeningUser[] = [];
      vi.mocked(socialService.getListeningFriends).mockResolvedValueOnce(mockListening);

      const { result } = renderHook(() => useListeningFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockListening);
    });
  });

  describe('useFriendsActivity', () => {
    it('should fetch activity with limit', async () => {
      const mockActivity: socialService.ActivityItem[] = [];
      vi.mocked(socialService.getFriendsActivity).mockResolvedValueOnce(mockActivity);

      const { result } = renderHook(() => useFriendsActivity(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(socialService.getFriendsActivity).toHaveBeenCalledWith(10);
    });
  });

  describe('useSearchUsers', () => {
    it('should not search with query less than 2 chars', async () => {
      const { result } = renderHook(() => useSearchUsers('a'), {
        wrapper: createWrapper(),
      });

      // Query should not be enabled
      expect(result.current.isFetching).toBe(false);
      expect(socialService.searchUsers).not.toHaveBeenCalled();
    });

    it('should search with query of 2+ chars', async () => {
      vi.mocked(socialService.searchUsers).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useSearchUsers('te'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(socialService.searchUsers).toHaveBeenCalledWith('te');
    });

    it('should not search when disabled', async () => {
      const { result } = renderHook(() => useSearchUsers('test', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(socialService.searchUsers).not.toHaveBeenCalled();
    });
  });

  describe('useSendFriendRequest', () => {
    it('should send friend request and invalidate queries', async () => {
      const mockFriendship: socialService.Friendship = {
        id: 'friendship-1',
        requesterId: 'me',
        addresseeId: 'user-1',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      vi.mocked(socialService.sendFriendRequest).mockResolvedValueOnce(mockFriendship);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSendFriendRequest(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('user-1');

      expect(socialService.sendFriendRequest).toHaveBeenCalledWith('user-1');
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useAcceptFriendRequest', () => {
    it('should accept friend request and invalidate queries', async () => {
      const mockFriendship: socialService.Friendship = {
        id: 'friendship-1',
        requesterId: 'user-1',
        addresseeId: 'me',
        status: 'accepted',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      vi.mocked(socialService.acceptFriendRequest).mockResolvedValueOnce(mockFriendship);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAcceptFriendRequest(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('friendship-1');

      expect(socialService.acceptFriendRequest).toHaveBeenCalledWith('friendship-1');
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useRemoveFriendship', () => {
    it('should remove friendship and invalidate queries', async () => {
      vi.mocked(socialService.removeFriendship).mockResolvedValueOnce(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveFriendship(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('friendship-1');

      expect(socialService.removeFriendship).toHaveBeenCalledWith('friendship-1');
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
