import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardApi } from './dashboard.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('dashboardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('should call the correct endpoint', async () => {
      const mockData = { libraryStats: { totalTracks: 100 } };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const result = await dashboardApi.getStats();

      expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard/stats');
      expect(result).toEqual(mockData);
    });

    it('should propagate errors', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(dashboardApi.getStats()).rejects.toThrow('Network error');
    });
  });
});
