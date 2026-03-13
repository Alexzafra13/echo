import { apiClient } from '@shared/services/api';

// ============================================
// Types
// ============================================

export interface PersistentNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'enrichment_completed'
  | 'system_alert'
  | 'scan_completed'
  | 'new_content';

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

export interface ListNotificationsResponse {
  notifications: PersistentNotification[];
  total: number;
}

// ============================================
// API
// ============================================

export const notificationsApi = {
  /** Get paginated notifications */
  async list(params?: {
    skip?: number;
    take?: number;
    unreadOnly?: boolean;
  }): Promise<ListNotificationsResponse> {
    const response = await apiClient.get<ListNotificationsResponse>(
      '/notifications',
      { params },
    );
    return response.data;
  },

  /** Get unread count */
  async getUnreadCount(): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>(
      '/notifications/unread-count',
    );
    return response.data;
  },

  /** Mark single notification as read */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  /** Mark all notifications as read */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  /** Delete all notifications */
  async deleteAll(): Promise<void> {
    await apiClient.delete('/notifications');
  },

  /** Get notification preferences */
  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get<{
      preferences: { notificationType: string; enabled: boolean }[];
    }>('/notifications/preferences');
    // Backend returns `notificationType`, map to frontend's `type`
    return response.data.preferences.map((p) => ({
      type: p.notificationType as NotificationType,
      enabled: p.enabled,
    }));
  },

  /** Update a notification preference */
  async updatePreference(type: NotificationType, enabled: boolean): Promise<void> {
    await apiClient.put(`/notifications/preferences/${type}`, { enabled });
  },
};
