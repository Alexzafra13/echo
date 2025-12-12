import { apiClient } from '@shared/services/api';
import type { SharedAlbumsResponse, ConnectedServer } from '../types';

export interface SharedAlbumsParams {
  page?: number;
  limit?: number;
  search?: string;
  serverId?: string;
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
};
