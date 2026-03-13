import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsApi,
  type PersistentNotification,
  type NotificationType,
  type NotificationPreference,
} from '../api/notifications.api';

// ============================================
// Query Keys
// ============================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: { skip?: number; take?: number; unreadOnly?: boolean }) =>
    ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

// ============================================
// Queries
// ============================================

/** Paginated list of notifications */
export function useNotificationsList(params?: {
  skip?: number;
  take?: number;
  unreadOnly?: boolean;
}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.list(params),
    staleTime: 30_000, // 30s
  });
}

/** Unread notification count (for badge) */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 15_000, // 15s
    refetchInterval: 60_000, // Poll every 60s as fallback
  });
}

/** Notification preferences */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: 5 * 60_000, // 5min
  });
}

// ============================================
// Mutations
// ============================================

/** Mark a single notification as read */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      queryClient.setQueriesData<{ notifications: PersistentNotification[]; total: number }>(
        { queryKey: ['notifications', 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          };
        }
      );

      queryClient.setQueryData<{ count: number }>(notificationKeys.unreadCount, (old) =>
        old ? { count: Math.max(0, old.count - 1) } : old
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/** Mark all notifications as read */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      queryClient.setQueriesData<{ notifications: PersistentNotification[]; total: number }>(
        { queryKey: ['notifications', 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, isRead: true })),
          };
        }
      );

      queryClient.setQueryData<{ count: number }>(notificationKeys.unreadCount, { count: 0 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/** Delete all notifications */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/** Update notification preference */
export function useUpdatePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) =>
      notificationsApi.updatePreference(type, enabled),
    onMutate: async ({ type, enabled }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences });

      queryClient.setQueryData<NotificationPreference[]>(notificationKeys.preferences, (old) => {
        if (!old) return old;
        return old.map((p) => (p.type === type ? { ...p, enabled } : p));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences });
    },
  });
}
