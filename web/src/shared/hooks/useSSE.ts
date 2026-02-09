import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@shared/utils/logger';

interface UseSSEOptions {
  /** SSE endpoint URL. Pass null/undefined to disable the connection. */
  url: string | null | undefined;
  /** Named event handlers: eventName → handler(event) */
  events?: Record<string, (event: MessageEvent) => void>;
  /** Called when connection opens successfully */
  onOpen?: () => void;
  /** Called when connection state changes (true = connected, false = disconnected) */
  onConnectionChange?: (connected: boolean) => void;
  /** Debug label for log messages */
  label?: string;
}

/**
 * Generic SSE (Server-Sent Events) hook with:
 * - Automatic exponential backoff reconnection (max 30s)
 * - Page visibility handling (disconnect on hidden, reconnect on visible)
 * - Cleanup on unmount
 *
 * @example
 * ```tsx
 * useSSE({
 *   url: userId ? `/api/social/listening/stream?userId=${userId}` : null,
 *   label: 'ListeningNow',
 *   onOpen: () => queryClient.invalidateQueries({ queryKey: ['listening'] }),
 *   events: {
 *     'listening-update': (event) => {
 *       const data = JSON.parse(event.data);
 *       queryClient.invalidateQueries({ queryKey: ['listening'] });
 *     },
 *   },
 * });
 * ```
 */
export function useSSE({
  url,
  events,
  onOpen,
  onConnectionChange,
  label = 'SSE',
}: UseSSEOptions): void {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Use refs for callbacks to avoid reconnecting when handlers change
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  const connect = useCallback(() => {
    if (!url) return;

    // Close any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource(url);

      es.onopen = () => {
        logger.debug(`[${label}] Connected`);
        reconnectAttemptsRef.current = 0;
        onOpenRef.current?.();
        onConnectionChangeRef.current?.(true);
      };

      // Register named event handlers via refs so they always call the latest version
      const currentEvents = eventsRef.current;
      if (currentEvents) {
        for (const eventName of Object.keys(currentEvents)) {
          es.addEventListener(eventName, (event: MessageEvent) => {
            eventsRef.current?.[eventName]?.(event);
          });
        }
      }

      es.addEventListener('keepalive', () => {});
      es.addEventListener('connected', () => {
        logger.debug(`[${label}] Stream confirmed`);
      });

      es.onerror = () => {
        es.close();
        onConnectionChangeRef.current?.(false);

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = es;
    } catch (err) {
      logger.error(`[${label}] Failed to create EventSource:`, err);
    }
  }, [url, label]);

  // Connect when URL is set, cleanup when it changes or on unmount
  useEffect(() => {
    if (!url) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        onConnectionChangeRef.current?.(false);
      }
      return;
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [url, connect]);

  // Pause on tab hidden, resume on tab visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          onConnectionChangeRef.current?.(false);
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (url) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [url, connect]);
}
