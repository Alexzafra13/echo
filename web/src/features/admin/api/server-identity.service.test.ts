import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serverIdentityApi } from './server-identity.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('serverIdentityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getServerName', () => {
    it('should return the server name', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { name: 'My Server' } });

      const result = await serverIdentityApi.getServerName();

      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/federation/server-name');
      expect(result).toBe('My Server');
    });
  });

  describe('getServerColor', () => {
    it('should return the server color', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { color: 'blue' } });

      const result = await serverIdentityApi.getServerColor();

      expect(apiClient.get).toHaveBeenCalledWith('/admin/settings/federation/server-color');
      expect(result).toBe('blue');
    });

    it('should default to purple when color is empty', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { color: '' } });

      const result = await serverIdentityApi.getServerColor();

      expect(result).toBe('purple');
    });
  });

  describe('getServerIdentity', () => {
    it('should fetch both name and color in parallel', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url.includes('server-name')) return Promise.resolve({ data: { name: 'Echo' } });
        if (url.includes('server-color')) return Promise.resolve({ data: { color: 'red' } });
        return Promise.reject(new Error('unknown'));
      });

      const result = await serverIdentityApi.getServerIdentity();

      expect(apiClient.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ name: 'Echo', color: 'red' });
    });

    it('should default color to purple when empty', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url.includes('server-name')) return Promise.resolve({ data: { name: 'Echo' } });
        if (url.includes('server-color')) return Promise.resolve({ data: { color: '' } });
        return Promise.reject(new Error('unknown'));
      });

      const result = await serverIdentityApi.getServerIdentity();

      expect(result.color).toBe('purple');
    });
  });

  describe('updateServerName', () => {
    it('should PUT the new name', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({});

      await serverIdentityApi.updateServerName('New Name');

      expect(apiClient.put).toHaveBeenCalledWith('/admin/settings/server.name', {
        value: 'New Name',
      });
    });
  });

  describe('updateServerColor', () => {
    it('should PUT the new color', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({});

      await serverIdentityApi.updateServerColor('green');

      expect(apiClient.put).toHaveBeenCalledWith('/admin/settings/server.color', {
        value: 'green',
      });
    });
  });
});
