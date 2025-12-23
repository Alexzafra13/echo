import { apiClient } from '@shared/services/api';

// ============================================
// Types
// ============================================

export interface ConnectedServer {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  isOnline: boolean;
  lastOnlineAt?: string;
  lastCheckedAt?: string;
  remoteAlbumCount: number;
  remoteTrackCount: number;
  remoteArtistCount: number;
  lastSyncAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
}

export interface InvitationToken {
  id: string;
  token: string;
  name?: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isUsed: boolean;
  createdAt: string;
}

export type MutualFederationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface AccessToken {
  id: string;
  serverName: string;
  serverUrl?: string;
  permissions: {
    canBrowse: boolean;
    canStream: boolean;
    canDownload: boolean;
  };
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  mutualStatus?: MutualFederationStatus;
}

export interface RemoteAlbum {
  id: string;
  name: string;
  artistName: string;
  artistId: string;
  year?: number;
  songCount: number;
  duration: number;
  size: number;
  coverUrl?: string;
  genres?: string[];
}

export interface RemoteTrack {
  id: string;
  title: string;
  artistName: string;
  albumName: string;
  albumId: string;
  trackNumber?: number;
  discNumber?: number;
  duration: number;
  size: number;
  bitRate?: number;
}

export interface RemoteLibrary {
  albums: RemoteAlbum[];
  totalAlbums: number;
  totalTracks: number;
  totalArtists: number;
}

// ============================================
// Request/Response types
// ============================================

export interface CreateInvitationRequest {
  name?: string;
  expiresInDays?: number;
  maxUses?: number;
}

export interface ConnectToServerRequest {
  serverUrl: string;
  invitationToken: string;
  serverName?: string;
  localServerUrl?: string;
  requestMutual?: boolean;
}

export interface UpdatePermissionsRequest {
  canBrowse?: boolean;
  canStream?: boolean;
  canDownload?: boolean;
}

// ============================================
// API
// ============================================

export const federationApi = {
  // ============================================
  // Invitation Tokens (Para que otros se conecten a ti)
  // ============================================

  /**
   * Lista todos los tokens de invitación creados
   */
  async listInvitations(): Promise<InvitationToken[]> {
    const response = await apiClient.get<InvitationToken[]>('/federation/invitations');
    return response.data;
  },

  /**
   * Crea un nuevo token de invitación
   */
  async createInvitation(data: CreateInvitationRequest): Promise<InvitationToken> {
    const response = await apiClient.post<InvitationToken>('/federation/invitations', data);
    return response.data;
  },

  /**
   * Elimina un token de invitación
   */
  async deleteInvitation(id: string): Promise<void> {
    await apiClient.delete(`/federation/invitations/${id}`);
  },

  // ============================================
  // Connected Servers (Servidores a los que te has conectado)
  // ============================================

  /**
   * Lista todos los servidores conectados
   */
  async listServers(): Promise<ConnectedServer[]> {
    const response = await apiClient.get<ConnectedServer[]>('/federation/servers');
    return response.data;
  },

  /**
   * Obtiene un servidor específico
   */
  async getServer(id: string): Promise<ConnectedServer> {
    const response = await apiClient.get<ConnectedServer>(`/federation/servers/${id}`);
    return response.data;
  },

  /**
   * Conecta a un nuevo servidor usando un token de invitación
   */
  async connectToServer(data: ConnectToServerRequest): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>('/federation/servers', data);
    return response.data;
  },

  /**
   * Sincroniza con un servidor remoto
   */
  async syncServer(id: string): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>(`/federation/servers/${id}/sync`);
    return response.data;
  },

  /**
   * Desconecta de un servidor
   */
  async disconnectFromServer(id: string): Promise<void> {
    await apiClient.delete(`/federation/servers/${id}`);
  },

  /**
   * Verifica el estado de todos los servidores conectados
   */
  async checkAllServersHealth(): Promise<ConnectedServer[]> {
    const response = await apiClient.post<ConnectedServer[]>('/federation/servers/health');
    return response.data;
  },

  /**
   * Verifica el estado de un servidor específico
   */
  async checkServerHealth(id: string): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>(`/federation/servers/${id}/health`);
    return response.data;
  },

  // ============================================
  // Remote Library (Biblioteca de servidor remoto)
  // ============================================

  /**
   * Obtiene la biblioteca de un servidor remoto
   */
  async getRemoteLibrary(serverId: string, page = 1, limit = 50): Promise<RemoteLibrary> {
    const response = await apiClient.get<RemoteLibrary>(
      `/federation/servers/${serverId}/library?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Obtiene los álbums de un servidor remoto
   */
  async getRemoteAlbums(
    serverId: string,
    page = 1,
    limit = 50,
    search?: string
  ): Promise<{ albums: RemoteAlbum[]; total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    const response = await apiClient.get<{ albums: RemoteAlbum[]; total: number }>(
      `/federation/servers/${serverId}/albums?${params}`
    );
    return response.data;
  },

  /**
   * Obtiene un álbum específico con sus tracks
   */
  async getRemoteAlbum(
    serverId: string,
    albumId: string
  ): Promise<RemoteAlbum & { tracks: RemoteTrack[] }> {
    const response = await apiClient.get<RemoteAlbum & { tracks: RemoteTrack[] }>(
      `/federation/servers/${serverId}/albums/${albumId}`
    );
    return response.data;
  },

  // ============================================
  // Access Tokens (Servidores que pueden acceder a tu biblioteca)
  // ============================================

  /**
   * Lista todos los servidores que tienen acceso a tu biblioteca
   */
  async listAccessTokens(): Promise<AccessToken[]> {
    const response = await apiClient.get<AccessToken[]>('/federation/access-tokens');
    return response.data;
  },

  /**
   * Revoca el acceso de un servidor
   */
  async revokeAccessToken(id: string): Promise<void> {
    await apiClient.delete(`/federation/access-tokens/${id}`);
  },

  /**
   * Actualiza los permisos de un servidor conectado
   */
  async updatePermissions(id: string, permissions: UpdatePermissionsRequest): Promise<AccessToken> {
    const response = await apiClient.patch<AccessToken>(
      `/federation/access-tokens/${id}/permissions`,
      permissions
    );
    return response.data;
  },

  // ============================================
  // Mutual Federation (Solicitudes de federación mutua)
  // ============================================

  /**
   * Lista las solicitudes de federación mutua pendientes
   */
  async listPendingMutualRequests(): Promise<AccessToken[]> {
    const response = await apiClient.get<AccessToken[]>('/federation/access-tokens/pending-mutual');
    return response.data;
  },

  /**
   * Aprueba una solicitud de federación mutua
   */
  async approveMutualRequest(id: string): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>(`/federation/access-tokens/${id}/approve-mutual`);
    return response.data;
  },

  /**
   * Rechaza una solicitud de federación mutua
   */
  async rejectMutualRequest(id: string): Promise<void> {
    await apiClient.post(`/federation/access-tokens/${id}/reject-mutual`);
  },
};
