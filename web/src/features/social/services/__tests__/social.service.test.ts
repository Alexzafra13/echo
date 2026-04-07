import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@shared/services/api';
import {
  getSocialOverview,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getPendingRequests,
  getListeningFriends,
  getFriendsActivity,
  searchUsers,
} from '../social.service';
import type { SocialOverview, Friend, Friendship, PendingRequests, ListeningUser, ActivityItem, SearchUserResult } from '../social.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('social.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFriend: Friend = {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: '/avatar.jpg',
    isPublicProfile: true,
    friendshipId: 'friendship-1',
    friendsSince: '2024-01-01T00:00:00Z',
  };

  const mockListeningUser: ListeningUser = {
    id: 'user-1',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: '/avatar.jpg',
    isPlaying: true,
    currentTrack: {
      id: 'track-1',
      title: 'Song Title',
      artistName: 'Artist Name',
      albumName: 'Album Name',
      albumId: 'album-1',
      coverUrl: '/cover.jpg',
    },
    updatedAt: '2024-01-01T12:00:00Z',
  };

  const mockActivity: ActivityItem = {
    id: 'activity-1',
    user: { id: 'user-1', username: 'testuser', name: 'Test User', avatarUrl: null },
    actionType: 'liked_track',
    targetType: 'track',
    targetId: 'track-1',
    targetName: 'Song Title',
    createdAt: '2024-01-01T12:00:00Z',
  };

  describe('getSocialOverview', () => {
    it('should fetch social overview', async () => {
      const mockOverview: SocialOverview = {
        friends: [mockFriend],
        pendingRequests: { received: [], sent: [], count: 0 },
        listeningNow: [mockListeningUser],
        recentActivity: [mockActivity],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOverview });

      const result = await getSocialOverview();

      expect(apiClient.get).toHaveBeenCalledWith('/social');
      expect(result).toEqual(mockOverview);
    });
  });

  describe('getFriends', () => {
    it('should fetch friends list', async () => {
      const mockFriends = [mockFriend];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockFriends });

      const result = await getFriends();

      expect(apiClient.get).toHaveBeenCalledWith('/social/friends');
      expect(result).toEqual(mockFriends);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send friend request', async () => {
      const mockFriendship: Friendship = {
        id: 'friendship-1',
        requesterId: 'me',
        addresseeId: 'user-1',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockFriendship });

      const result = await sendFriendRequest('user-1');

      expect(apiClient.post).toHaveBeenCalledWith('/social/friends/request', {
        addresseeId: 'user-1',
      });
      expect(result).toEqual(mockFriendship);
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request', async () => {
      const mockFriendship: Friendship = {
        id: 'friendship-1',
        requesterId: 'user-1',
        addresseeId: 'me',
        status: 'accepted',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockFriendship });

      const result = await acceptFriendRequest('friendship-1');

      expect(apiClient.post).toHaveBeenCalledWith('/social/friends/accept/friendship-1');
      expect(result).toEqual(mockFriendship);
    });
  });

  describe('removeFriendship', () => {
    it('should remove friendship', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

      await removeFriendship('friendship-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/social/friends/friendship-1');
    });
  });

  describe('getPendingRequests', () => {
    it('should fetch pending requests', async () => {
      const mockPending: PendingRequests = {
        received: [mockFriend],
        sent: [],
        count: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPending });

      const result = await getPendingRequests();

      expect(apiClient.get).toHaveBeenCalledWith('/social/friends/pending');
      expect(result).toEqual(mockPending);
    });
  });

  describe('getListeningFriends', () => {
    it('should fetch listening friends', async () => {
      const mockListening = [mockListeningUser];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockListening });

      const result = await getListeningFriends();

      expect(apiClient.get).toHaveBeenCalledWith('/social/listening');
      expect(result).toEqual(mockListening);
    });
  });

  describe('getFriendsActivity', () => {
    it('should fetch activity without limit', async () => {
      const mockActivities = [mockActivity];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockActivities });

      const result = await getFriendsActivity();

      expect(apiClient.get).toHaveBeenCalledWith('/social/activity', { params: undefined });
      expect(result).toEqual(mockActivities);
    });

    it('should fetch activity with limit', async () => {
      const mockActivities = [mockActivity];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockActivities });

      const result = await getFriendsActivity(10);

      expect(apiClient.get).toHaveBeenCalledWith('/social/activity', { params: { limit: 10 } });
      expect(result).toEqual(mockActivities);
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      const mockResults: SearchUserResult[] = [
        { ...mockFriend, friendshipStatus: null },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResults });

      const result = await searchUsers('test');

      expect(apiClient.get).toHaveBeenCalledWith('/social/users/search', {
        params: { q: 'test' },
      });
      expect(result).toEqual(mockResults);
    });

    it('should search users with limit', async () => {
      const mockResults: SearchUserResult[] = [];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResults });

      await searchUsers('test', 5);

      expect(apiClient.get).toHaveBeenCalledWith('/social/users/search', {
        params: { q: 'test', limit: 5 },
      });
    });
  });
});
