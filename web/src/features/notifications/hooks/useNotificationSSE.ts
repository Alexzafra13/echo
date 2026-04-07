import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedSSE } from '@shared/hooks/useUnifiedSSE';
import { notificationKeys } from './useNotifications';
import { logger } from '@shared/utils/logger';

/**
 * useNotificationSSE
 *
 * Listens for notification events on the unified SSE stream.
 * Invalidates React Query caches on new notifications.
 */
export function useNotificationSSE() {
  const eventSource = useUnifiedSSE();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventSource) return;

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        logger.debug('[NotificationSSE] New notification:', data.type);

        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.addEventListener('notifications:notification', handler);

    return () => {
      eventSource.removeEventListener('notifications:notification', handler);
    };
  }, [eventSource, queryClient]);
}
