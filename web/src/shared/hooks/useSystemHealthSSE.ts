import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@shared/utils/logger';

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  scanner: 'idle' | 'running' | 'error';
  storage: 'healthy' | 'warning' | 'critical';
  metadataApis: {
    lastfm: 'healthy' | 'degraded' | 'down';
    fanart: 'healthy' | 'degraded' | 'down';
    musicbrainz: 'healthy' | 'degraded' | 'down';
  };
}

interface ActiveAlerts {
  scanErrors: number;
  missingFiles: number;
  storageDetails?: {
    currentMB: number;
    limitMB: number;
    percentUsed: number;
  };
}

interface HealthData {
  systemHealth: SystemHealth;
  activeAlerts: ActiveAlerts;
}

/**
 * Hook for real-time system health updates via SSE.
 * Only active for admin users.
 *
 * @param token - JWT token (used to verify admin status)
 * @param isAdmin - Whether the user is an admin
 */
export function useSystemHealthSSE(token: string | null, isAdmin: boolean) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!token || !isAdmin) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      // Send token as query parameter (EventSource can't send headers)
      const url = `${apiUrl}/admin/dashboard/health/stream?token=${encodeURIComponent(token)}`;

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        logger.debug('[SSE] Connected to system health stream');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(event.data);

          switch (type) {
            case 'health:initial':
            case 'health:changed':
              setHealth({
                systemHealth: data.systemHealth,
                activeAlerts: data.activeAlerts,
              });
              break;

            case 'keepalive':
              // Connection is healthy
              break;

            default:
              break;
          }
        } catch (err) {
          logger.error('[SSE] Failed to parse health event:', err);
        }
      };

      eventSource.onerror = () => {
        logger.error('[SSE] System health connection error');
        setIsConnected(false);
        eventSource.close();

        // Exponential backoff for reconnection (max 30 seconds)
        const backoffDelay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffDelay);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      logger.error('[SSE] Failed to create EventSource:', err);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) return;

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
      setIsConnected(false);
    };
  }, [token, isAdmin, connect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          setIsConnected(false);
        }
      } else if (token && isAdmin) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, isAdmin, connect]);

  return {
    systemHealth: health?.systemHealth ?? null,
    activeAlerts: health?.activeAlerts ?? null,
    isConnected,
  };
}
