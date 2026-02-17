import { apiClient } from '@shared/services/api';
import type { ConnectedServer, RemoteAlbum, RemoteTrack } from '@features/federation/types';

export type { ConnectedServer, RemoteAlbum, RemoteTrack };

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

export interface RemoteLibrary {
  albums: RemoteAlbum[];
  totalAlbums: number;
  totalTracks: number;
  totalArtists: number;
}

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

export const federationApi = {
  async listInvitations(): Promise<InvitationToken[]> {
    const response = await apiClient.get<InvitationToken[]>('/federation/invitations');
    return response.data;
  },

  async createInvitation(data: CreateInvitationRequest): Promise<InvitationToken> {
    const response = await apiClient.post<InvitationToken>('/federation/invitations', data);
    return response.data;
  },

  async deleteInvitation(id: string): Promise<void> {
    await apiClient.delete(`/federation/invitations/${id}`);
  },

  async listServers(): Promise<ConnectedServer[]> {
    const response = await apiClient.get<ConnectedServer[]>('/federation/servers');
    return response.data;
  },

  async getServer(id: string): Promise<ConnectedServer> {
    const response = await apiClient.get<ConnectedServer>(`/federation/servers/${id}`);
    return response.data;
  },

  async connectToServer(data: ConnectToServerRequest): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>('/federation/servers', data);
    return response.data;
  },

  async syncServer(id: string): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>(`/federation/servers/${id}/sync`);
    return response.data;
  },

  async disconnectFromServer(id: string): Promise<void> {
    await apiClient.delete(`/federation/servers/${id}`);
  },

  async checkAllServersHealth(): Promise<ConnectedServer[]> {
    const response = await apiClient.post<ConnectedServer[]>('/federation/servers/health');
    return response.data;
  },

  async checkServerHealth(id: string): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>(`/federation/servers/${id}/health`);
    return response.data;
  },

  async getRemoteLibrary(serverId: string, page = 1, limit = 50): Promise<RemoteLibrary> {
    const response = await apiClient.get<RemoteLibrary>(
      `/federation/servers/${serverId}/library?page=${page}&limit=${limit}`
    );
    return response.data;
  },

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

  async getRemoteAlbum(
    serverId: string,
    albumId: string
  ): Promise<RemoteAlbum & { tracks: RemoteTrack[] }> {
    const response = await apiClient.get<RemoteAlbum & { tracks: RemoteTrack[] }>(
      `/federation/servers/${serverId}/albums/${albumId}`
    );
    return response.data;
  },

  async listAccessTokens(): Promise<AccessToken[]> {
    const response = await apiClient.get<AccessToken[]>('/federation/access-tokens');
    return response.data;
  },

  async revokeAccessToken(id: string): Promise<void> {
    await apiClient.delete(`/federation/access-tokens/${id}`);
  },

  async deleteAccessToken(id: string): Promise<void> {
    await apiClient.delete(`/federation/access-tokens/${id}?permanent=true`);
  },

  async reactivateAccessToken(id: string): Promise<AccessToken> {
    const response = await apiClient.post<AccessToken>(`/federation/access-tokens/${id}/reactivate`);
    return response.data;
  },

  async updatePermissions(id: string, permissions: UpdatePermissionsRequest): Promise<AccessToken> {
    const response = await apiClient.patch<AccessToken>(
      `/federation/access-tokens/${id}/permissions`,
      permissions
    );
    return response.data;
  },

  async listPendingMutualRequests(): Promise<AccessToken[]> {
    const response = await apiClient.get<AccessToken[]>('/federation/access-tokens/pending-mutual');
    return response.data;
  },

  async approveMutualRequest(id: string): Promise<ConnectedServer> {
    const response = await apiClient.post<ConnectedServer>(`/federation/access-tokens/${id}/approve-mutual`);
    return response.data;
  },

  async rejectMutualRequest(id: string): Promise<void> {
    await apiClient.post(`/federation/access-tokens/${id}/reject-mutual`);
  },
};
