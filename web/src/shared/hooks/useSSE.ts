import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@shared/utils/logger';

interface UseSSEOptions {
  url: string | null | undefined;
  events?: Record<string, (event: MessageEvent) => void>;
  onOpen?: () => void;
  onConnectionChange?: (connected: boolean) => void;
  label?: string;
}

// Hook genérico SSE con reconexión exponencial y manejo de visibilidad
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

  // Refs para evitar reconexiones cuando cambian los handlers
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  const connect = useCallback(() => {
    if (!url) return;

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

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      eventSourceRef.current = es;
    } catch (err) {
      logger.error(`[${label}] Failed to create EventSource:`, err);
    }
  }, [url, label]);

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

  // Pausar en tab oculto, reconectar al volver
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
