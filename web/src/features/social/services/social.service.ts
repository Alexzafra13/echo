import { apiClient } from '@shared/services/api';

// ============================================
// Types
// ============================================

export interface UserBasic {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Friend extends UserBasic {
  isPublicProfile: boolean;
  friendshipId: string;
  friendsSince: string;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface PendingRequests {
  received: Friend[];
  sent: Friend[];
  count: number;
}

export interface ListeningTrack {
  id: string;
  title: string;
  artistName: string;
  albumName: string;
  albumId: string;
  coverUrl: string | null;
}

export interface ListeningUser extends UserBasic {
  isPlaying: boolean;
  currentTrack: ListeningTrack | null;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  user: UserBasic;
  actionType: string;
  targetType: string;
  targetId: string;
  targetName: string;
  targetExtra?: string;
  targetCoverUrl?: string | null;
  targetAlbumId?: string; // for tracks: the album ID for navigation
  targetAlbumIds?: string[]; // for playlists: up to 4 album IDs for mosaic cover
  secondUser?: UserBasic; // for became_friends: the other user
  createdAt: string;
}

export interface SearchUserResult extends UserBasic {
  friendshipStatus: 'pending' | 'accepted' | 'blocked' | null;
}

export interface SocialOverview {
  friends: Friend[];
  pendingRequests: PendingRequests;
  listeningNow: ListeningUser[];
  recentActivity: ActivityItem[];
}

// ============================================
// API Functions
// ============================================

/**
 * Get social overview (main page data)
 */
export async function getSocialOverview(): Promise<SocialOverview> {
  const response = await apiClient.get<SocialOverview>('/social');
  return response.data;
}

/**
 * Get all friends
 */
export async function getFriends(): Promise<Friend[]> {
  const response = await apiClient.get<Friend[]>('/social/friends');
  return response.data;
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(addresseeId: string): Promise<Friendship> {
  const response = await apiClient.post<Friendship>('/social/friends/request', {
    addresseeId,
  });
  return response.data;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId: string): Promise<Friendship> {
  const response = await apiClient.post<Friendship>(`/social/friends/accept/${friendshipId}`);
  return response.data;
}

/**
 * Remove a friendship or reject a request
 */
export async function removeFriendship(friendshipId: string): Promise<void> {
  await apiClient.delete(`/social/friends/${friendshipId}`);
}

/**
 * Get pending friend requests
 */
export async function getPendingRequests(): Promise<PendingRequests> {
  const response = await apiClient.get<PendingRequests>('/social/friends/pending');
  return response.data;
}

/**
 * Get friends who are currently listening
 */
export async function getListeningFriends(): Promise<ListeningUser[]> {
  const response = await apiClient.get<ListeningUser[]>('/social/listening');
  return response.data;
}

/**
 * Get friends' activity feed
 */
export async function getFriendsActivity(limit?: number): Promise<ActivityItem[]> {
  const params = limit ? { limit } : undefined;
  const response = await apiClient.get<ActivityItem[]>('/social/activity', { params });
  return response.data;
}

/**
 * Search users
 */
export async function searchUsers(query: string, limit?: number): Promise<SearchUserResult[]> {
  const params: Record<string, string | number> = { q: query };
  if (limit) params.limit = limit;
  const response = await apiClient.get<SearchUserResult[]>('/social/users/search', { params });
  return response.data;
}
