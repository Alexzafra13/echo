import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@shared/hooks/useAuth';
import { notificationKeys } from './useNotifications';
import { logger } from '@shared/utils/logger';

/**
 * useNotificationSSE
 *
 * Connects to the per-user notification SSE stream.
 * When a new notification arrives, invalidates React Query caches
 * so the notification list and unread count refresh automatically.
 *
 * Uses token-based auth via query parameter (EventSource can't set headers).
 */
export function useNotificationSSE() {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Cleanup on logout
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const connect = () => {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = `${baseUrl}/api/notifications/stream?token=${encodeURIComponent(token)}`;

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('notification', (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.debug('[NotificationSSE] New notification:', data.type);

          // Invalidate queries to refresh notification list and unread count
          queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('keepalive', () => {
        // Silent keepalive - connection is alive
      });

      es.onerror = () => {
        logger.debug('[NotificationSSE] Connection error, will reconnect...');
        es.close();
        eventSourceRef.current = null;

        // Reconnect after 5 seconds
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated && token) {
            connect();
          }
        }, 5000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [token, isAuthenticated, queryClient]);
}
