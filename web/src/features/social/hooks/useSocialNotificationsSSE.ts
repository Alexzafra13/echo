import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store/authStore';
import { logger } from '@shared/utils/logger';
import { socialKeys } from './useSocial';

/**
 * Friend request received event from SSE
 */
export interface FriendRequestReceivedEvent {
  friendshipId: string;
  fromUserId: string;
  fromUsername: string;
  fromName: string | null;
  toUserId: string;
  timestamp: string;
}

/**
 * Friend request accepted event from SSE
 */
export interface FriendRequestAcceptedEvent {
  friendshipId: string;
  acceptedByUserId: string;
  acceptedByUsername: string;
  acceptedByName: string | null;
  originalRequesterId: string;
  timestamp: string;
}

export type SocialNotification =
  | { type: 'friend_request:received'; data: FriendRequestReceivedEvent }
  | { type: 'friend_request:accepted'; data: FriendRequestAcceptedEvent };

type SocialNotificationHandler = (notification: SocialNotification) => void;

/**
 * Singleton manager for the social notifications SSE connection.
 * Ensures only one EventSource connection exists regardless of how many
 * hooks are subscribed.
 */
class SocialNotificationsSSEManager {
  private eventSource: EventSource | null = null;
  private handlers: Set<SocialNotificationHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private currentUserId: string | null = null;

  connect(userId: string) {
    // Already connected for this user
    if (this.eventSource && this.currentUserId === userId) {
      return;
    }

    // Different user - close existing connection
    if (this.eventSource && this.currentUserId !== userId) {
      this.disconnect();
    }

    this.currentUserId = userId;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/social/notifications/stream?userId=${encodeURIComponent(userId)}`;

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        logger.debug('[SSE] Connected to social notifications stream');
        this.reconnectAttempts = 0;
      };

      // Listen for friend request received events
      this.eventSource.addEventListener('friend_request:received', (event: MessageEvent) => {
        try {
          const data: FriendRequestReceivedEvent = JSON.parse(event.data);
          logger.debug('[SSE] Received friend request notification:', data);
          this.handlers.forEach((handler) =>
            handler({ type: 'friend_request:received', data })
          );
        } catch (err) {
          logger.error('[SSE] Failed to parse friend request received event:', err);
        }
      });

      // Listen for friend request accepted events
      this.eventSource.addEventListener('friend_request:accepted', (event: MessageEvent) => {
        try {
          const data: FriendRequestAcceptedEvent = JSON.parse(event.data);
          logger.debug('[SSE] Received friend request accepted notification:', data);
          this.handlers.forEach((handler) =>
            handler({ type: 'friend_request:accepted', data })
          );
        } catch (err) {
          logger.error('[SSE] Failed to parse friend request accepted event:', err);
        }
      });

      this.eventSource.addEventListener('connected', (event: MessageEvent) => {
        logger.debug('[SSE] Social notifications stream connected:', event.data);
      });

      this.eventSource.addEventListener('keepalive', () => {
        // Keepalive received - connection is healthy
      });

      this.eventSource.onerror = () => {
        logger.error('[SSE] Social notifications connection error');
        this.eventSource?.close();
        this.eventSource = null;

        // Only reconnect if we still have subscribers
        if (this.handlers.size > 0) {
          const backoffDelay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            30000
          );
          this.reconnectAttempts += 1;

          this.reconnectTimeout = setTimeout(() => {
            if (this.currentUserId) {
              this.connect(this.currentUserId);
            }
          }, backoffDelay);
        }
      };
    } catch (err) {
      logger.error('[SSE] Failed to create EventSource for social notifications:', err);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.currentUserId = null;
    this.reconnectAttempts = 0;
  }

  subscribe(handler: SocialNotificationHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
      // Disconnect if no more subscribers
      if (this.handlers.size === 0) {
        this.disconnect();
      }
    };
  }

  isConnected() {
    return this.eventSource !== null;
  }

  getCurrentUserId() {
    return this.currentUserId;
  }
}

// Singleton instance
const socialNotificationsSSEManager = new SocialNotificationsSSEManager();

/**
 * Hook for real-time social notifications via Server-Sent Events.
 *
 * Uses a shared singleton EventSource connection so multiple components
 * can subscribe without creating duplicate connections.
 *
 * When someone sends a friend request or accepts one, this hook receives
 * the notification instantly and can trigger callbacks or invalidate queries.
 *
 * @param onNotification - Optional callback when a notification is received
 * @returns Object with recent notifications for display
 */
export function useSocialNotificationsSSE(
  onNotification?: (notification: SocialNotification) => void
) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [recentNotifications, setRecentNotifications] = useState<SocialNotification[]>([]);

  const handleNotification = useCallback(
    (notification: SocialNotification) => {
      // Add to recent notifications (keep last 10)
      setRecentNotifications((prev) => [notification, ...prev].slice(0, 10));

      // Invalidate relevant queries
      if (notification.type === 'friend_request:received') {
        // Someone sent us a friend request - refresh pending requests
        queryClient.invalidateQueries({ queryKey: socialKeys.pendingRequests() });
        queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      } else if (notification.type === 'friend_request:accepted') {
        // Someone accepted our request - refresh friends list
        queryClient.invalidateQueries({ queryKey: socialKeys.friends() });
        queryClient.invalidateQueries({ queryKey: socialKeys.pendingRequests() });
        queryClient.invalidateQueries({ queryKey: socialKeys.overview() });
      }

      // Call optional callback
      onNotification?.(notification);
    },
    [queryClient, onNotification]
  );

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to notifications
    const unsubscribe = socialNotificationsSSEManager.subscribe(handleNotification);

    // Connect if not already connected
    if (
      !socialNotificationsSSEManager.isConnected() ||
      socialNotificationsSSEManager.getCurrentUserId() !== user.id
    ) {
      socialNotificationsSSEManager.connect(user.id);
    }

    return () => {
      unsubscribe();
    };
  }, [user?.id, handleNotification]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id && !socialNotificationsSSEManager.isConnected()) {
        socialNotificationsSSEManager.connect(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  return {
    recentNotifications,
    clearNotifications: () => setRecentNotifications([]),
  };
}
