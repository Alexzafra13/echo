export { notificationsApi } from './api/notifications.service';
export type {
  PersistentNotification,
  NotificationType,
  NotificationPreference,
  ListNotificationsResponse,
} from './api/notifications.service';

export {
  useNotificationsList,
  useUnreadCount,
  useNotificationPreferences,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteAllNotifications,
  useUpdatePreference,
  notificationKeys,
} from './hooks/useNotifications';

export { useNotificationSSE } from './hooks/useNotificationSSE';
