import { apiClient } from '@shared/services/api';

export interface ServerIdentity {
  name: string;
  color: string;
}

export const serverIdentityApi = {
  async getServerName(): Promise<string> {
    const response = await apiClient.get<{ name: string }>(
      '/admin/settings/federation/server-name'
    );
    return response.data.name;
  },

  async getServerColor(): Promise<string> {
    const response = await apiClient.get<{ color: string }>(
      '/admin/settings/federation/server-color'
    );
    return response.data.color || 'purple';
  },

  async getServerIdentity(): Promise<ServerIdentity> {
    const [nameRes, colorRes] = await Promise.all([
      apiClient.get<{ name: string }>('/admin/settings/federation/server-name'),
      apiClient.get<{ color: string }>('/admin/settings/federation/server-color'),
    ]);
    return {
      name: nameRes.data.name,
      color: colorRes.data.color || 'purple',
    };
  },

  async updateServerName(name: string): Promise<void> {
    await apiClient.put('/admin/settings/server.name', { value: name });
  },

  async updateServerColor(color: string): Promise<void> {
    await apiClient.put('/admin/settings/server.color', { value: color });
  },
};
