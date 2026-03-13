export { notificationsApi } from './api/notifications.api';
export type {
  PersistentNotification,
  NotificationType,
  NotificationPreference,
  ListNotificationsResponse,
} from './api/notifications.api';

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
