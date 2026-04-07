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
  | 'new_content'
  | 'session_invite';

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
  /** Obtener notificaciones paginadas */
  async list(params?: {
    skip?: number;
    take?: number;
    unreadOnly?: boolean;
  }): Promise<ListNotificationsResponse> {
    const response = await apiClient.get<ListNotificationsResponse>('/notifications', { params });
    return response.data;
  },

  /** Obtener contador de no leídas */
  async getUnreadCount(): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },

  /** Marcar una notificación como leída */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  /** Marcar todas las notificaciones como leídas */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  /** Eliminar todas las notificaciones */
  async deleteAll(): Promise<void> {
    await apiClient.delete('/notifications');
  },

  /** Obtener preferencias de notificaciones */
  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get<{
      preferences: { notificationType: string; enabled: boolean }[];
    }>('/notifications/preferences');
    // El backend devuelve `notificationType`, mapeamos a `type` del frontend
    return response.data.preferences.map((p) => ({
      type: p.notificationType as NotificationType,
      enabled: p.enabled,
    }));
  },

  /** Actualizar una preferencia de notificación */
  async updatePreference(type: NotificationType, enabled: boolean): Promise<void> {
    await apiClient.put(`/notifications/preferences/${type}`, { enabled });
  },
};
