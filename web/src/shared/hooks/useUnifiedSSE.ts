import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAuthStore } from '@shared/store/authStore';
import { refreshAccessToken } from '@shared/services/api';
import { logger } from '@shared/utils/logger';

// Shared singleton EventSource
let sharedEventSource: EventSource | null = null;
let sharedToken: string | null = null;
const subscribers = new Set<string>();
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let reconnecting = false;

function closeShared() {
  sharedEventSource?.close();
  sharedEventSource = null;
  sharedToken = null;
  reconnectAttempts = 0;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

function buildUrl(token: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/events/stream?token=${encodeURIComponent(token)}`;
}

/**
 * useUnifiedSSE
 *
 * Singleton SSE connection to `/api/events/stream` that multiplexes
 * notifications, metadata, and federation import events.
 * All consumers share the same EventSource instance.
 *
 * @returns EventSource instance or null if not connected
 */
export function useUnifiedSSE(): EventSource | null {
  const { token, isAuthenticated } = useAuth();
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const mountedRef = useRef(true);
  const subscriberId = useId();

  const connect = useCallback(() => {
    // Always read fresh token from store
    const currentToken = useAuthStore.getState().accessToken;
    if (!currentToken || subscribers.size === 0) return;

    const url = buildUrl(currentToken);
    const es = new EventSource(url);
    sharedEventSource = es;
    sharedToken = currentToken;

    es.onopen = () => {
      logger.debug('[UnifiedSSE] Connected');
      reconnectAttempts = 0;
      setEventSource(es);
    };

    es.onerror = () => {
      logger.debug('[UnifiedSSE] Connection error');
      es.close();
      if (sharedEventSource === es) {
        sharedEventSource = null;
        sharedToken = null;
      }

      if (subscribers.size === 0) return;

      if (!reconnecting) {
        reconnecting = true;
        refreshAccessToken()
          .then(() => {
            reconnecting = false;
            if (subscribers.size > 0) {
              connect();
            }
          })
          .catch(() => {
            reconnecting = false;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              if (subscribers.size > 0) {
                connect();
              }
            }, delay);
          });
      }
    };

    es.addEventListener('keepalive', () => {
      // Silent keepalive
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!isAuthenticated || !token) {
      setEventSource(null);
      return;
    }

    subscribers.add(subscriberId);

    // Reuse existing connection if token matches
    if (
      sharedEventSource &&
      sharedToken === token &&
      sharedEventSource.readyState !== EventSource.CLOSED
    ) {
      setEventSource(sharedEventSource);
    } else {
      closeShared();
      connect();
    }

    return () => {
      mountedRef.current = false;
      subscribers.delete(subscriberId);
      if (subscribers.size === 0) {
        closeShared();
      }
    };
  }, [token, isAuthenticated, subscriberId, connect]);

  // Handle visibility changes - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;
      if (
        isAuthenticated &&
        subscribers.size > 0 &&
        (!sharedEventSource || sharedEventSource.readyState === EventSource.CLOSED)
      ) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, connect]);

  // Close on logout
  useEffect(() => {
    if (!isAuthenticated && sharedEventSource) {
      closeShared();
      subscribers.clear();
      setEventSource(null);
    }
  }, [isAuthenticated]);

  return eventSource;
}
