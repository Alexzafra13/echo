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
 * Obtener resumen social (datos de la página principal)
 */
export async function getSocialOverview(): Promise<SocialOverview> {
  const response = await apiClient.get<SocialOverview>('/social');
  return response.data;
}

/**
 * Obtener todos los amigos
 */
export async function getFriends(): Promise<Friend[]> {
  const response = await apiClient.get<Friend[]>('/social/friends');
  return response.data;
}

/**
 * Enviar solicitud de amistad
 */
export async function sendFriendRequest(addresseeId: string): Promise<Friendship> {
  const response = await apiClient.post<Friendship>('/social/friends/request', {
    addresseeId,
  });
  return response.data;
}

/**
 * Aceptar solicitud de amistad
 */
export async function acceptFriendRequest(friendshipId: string): Promise<Friendship> {
  const response = await apiClient.post<Friendship>(`/social/friends/accept/${friendshipId}`);
  return response.data;
}

/**
 * Eliminar amistad o rechazar solicitud
 */
export async function removeFriendship(friendshipId: string): Promise<void> {
  await apiClient.delete(`/social/friends/${friendshipId}`);
}

/**
 * Obtener solicitudes de amistad pendientes
 */
export async function getPendingRequests(): Promise<PendingRequests> {
  const response = await apiClient.get<PendingRequests>('/social/friends/pending');
  return response.data;
}

/**
 * Obtener amigos que están escuchando actualmente
 */
export async function getListeningFriends(): Promise<ListeningUser[]> {
  const response = await apiClient.get<ListeningUser[]>('/social/listening');
  return response.data;
}

/**
 * Obtener feed de actividad de amigos
 */
export async function getFriendsActivity(limit?: number): Promise<ActivityItem[]> {
  const params = limit ? { limit } : undefined;
  const response = await apiClient.get<ActivityItem[]>('/social/activity', { params });
  return response.data;
}

/**
 * Buscar usuarios
 */
export async function searchUsers(query: string, limit?: number): Promise<SearchUserResult[]> {
  const params: Record<string, string | number> = { q: query };
  if (limit) params.limit = limit;
  const response = await apiClient.get<SearchUserResult[]>('/social/users/search', { params });
  return response.data;
}
