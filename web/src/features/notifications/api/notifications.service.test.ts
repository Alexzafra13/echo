import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsApi } from './notifications.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should GET /notifications with params', async () => {
      const mockData = { notifications: [], total: 0 };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const result = await notificationsApi.list({ skip: 0, take: 10, unreadOnly: true });

      expect(apiClient.get).toHaveBeenCalledWith('/notifications', {
        params: { skip: 0, take: 10, unreadOnly: true },
      });
      expect(result).toEqual(mockData);
    });

    it('should work without params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { notifications: [], total: 0 } });

      await notificationsApi.list();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications', { params: undefined });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { count: 5 } });

      const result = await notificationsApi.getUnreadCount();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should PATCH notification as read', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({});

      await notificationsApi.markAsRead('notif-123');

      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif-123/read');
    });
  });

  describe('markAllAsRead', () => {
    it('should PATCH all as read', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({});

      await notificationsApi.markAllAsRead();

      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  describe('deleteAll', () => {
    it('should DELETE all notifications', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      await notificationsApi.deleteAll();

      expect(apiClient.delete).toHaveBeenCalledWith('/notifications');
    });
  });

  describe('getPreferences', () => {
    it('should map backend notificationType to frontend type', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          preferences: [
            { notificationType: 'friend_request_received', enabled: true },
            { notificationType: 'system_alert', enabled: false },
          ],
        },
      });

      const result = await notificationsApi.getPreferences();

      expect(result).toEqual([
        { type: 'friend_request_received', enabled: true },
        { type: 'system_alert', enabled: false },
      ]);
    });
  });

  describe('updatePreference', () => {
    it('should PUT preference update', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({});

      await notificationsApi.updatePreference('scan_completed', false);

      expect(apiClient.put).toHaveBeenCalledWith('/notifications/preferences/scan_completed', {
        enabled: false,
      });
    });
  });
});
