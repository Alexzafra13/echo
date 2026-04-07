import { apiClient } from '@shared/services/api';
import type { SharedAlbumsResponse, ConnectedServer, RemoteAlbumWithTracks } from '../types';

export interface SharedAlbumsParams {
  page?: number;
  limit?: number;
  search?: string;
  serverId?: string;
}

export interface AlbumImport {
  id: string;
  userId: string;
  connectedServerId: string;
  remoteAlbumId: string;
  albumName: string;
  artistName: string | null;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalTracks: number;
  downloadedTracks: number;
  totalSize: number;
  downloadedSize: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const federationService = {
  /**
   * Get all connected servers
   */
  async getConnectedServers(): Promise<ConnectedServer[]> {
    const response = await apiClient.get<ConnectedServer[]>('/federation/servers');
    return response.data;
  },

  /**
   * Get shared albums from all connected servers (or a specific one)
   */
  async getSharedAlbums(params: SharedAlbumsParams = {}): Promise<SharedAlbumsResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.serverId) queryParams.append('serverId', params.serverId);

    const queryString = queryParams.toString();
    const url = `/federation/shared-albums${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<SharedAlbumsResponse>(url);
    return response.data;
  },

  /**
   * Start importing an album from a connected server
   */
  async startImport(serverId: string, remoteAlbumId: string): Promise<AlbumImport> {
    const response = await apiClient.post<AlbumImport>('/federation/import', {
      serverId,
      remoteAlbumId,
    });
    return response.data;
  },

  /**
   * Get all imports for the current user
   */
  async getImports(): Promise<AlbumImport[]> {
    const response = await apiClient.get<AlbumImport[]>('/federation/import');
    return response.data;
  },

  /**
   * Get import status
   */
  async getImportStatus(importId: string): Promise<AlbumImport> {
    const response = await apiClient.get<AlbumImport>(`/federation/import/${importId}`);
    return response.data;
  },

  /**
   * Cancel a pending import
   */
  async cancelImport(importId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/federation/import/${importId}`);
    return response.data;
  },

  /**
   * Get a specific album from a connected server (includes tracks)
   */
  async getRemoteAlbum(serverId: string, albumId: string): Promise<RemoteAlbumWithTracks> {
    const response = await apiClient.get<RemoteAlbumWithTracks>(
      `/federation/servers/${serverId}/albums/${albumId}`,
    );
    return response.data;
  },
};
