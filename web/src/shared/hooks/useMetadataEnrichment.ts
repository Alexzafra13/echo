import { useState, useCallback, useEffect, useRef } from 'react';
import { logger } from '@shared/utils/logger';

/**
 * Notificación de enriquecimiento de metadatos
 */
export interface EnrichmentNotification {
  id: string;
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  bioUpdated?: boolean;
  imagesUpdated?: boolean;
  coverUpdated?: boolean;
  timestamp: string;
  read: boolean;
}

/**
 * Progreso del enriquecimiento
 */
export interface EnrichmentProgress {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  current: number;
  total: number;
  step: string;
  details?: string;
  percentage: number;
  timestamp: string;
}

/**
 * Hook para conectarse a los eventos de metadata enrichment via SSE
 *
 * @param token - JWT token para autenticación (no usado con SSE público)
 * @param isAdmin - Si el usuario es admin (solo admins reciben notificaciones)
 * @returns Estado de enriquecimiento y notificaciones
 *
 * @example
 * ```tsx
 * const { notifications, progress, isConnected, markAsRead, clearAll } = useMetadataEnrichment(token, isAdmin);
 *
 * return (
 *   <div>
 *     <p>Notificaciones: {notifications.length}</p>
 *     {progress && <p>Enriqueciendo: {progress.entityName} - {progress.percentage}%</p>}
 *   </div>
 * );
 * ```
 */
export function useMetadataEnrichment(token: string | null, isAdmin: boolean) {
  const [notifications, setNotifications] = useState<EnrichmentNotification[]>([]);
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!token || !isAdmin) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/metadata/stream`;

      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        logger.debug('[SSE] Connected to metadata enrichment stream');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const { type, data } = JSON.parse(event.data);

          switch (type) {
            case 'enrichment:started':
              setProgress({
                entityType: data.entityType,
                entityId: data.entityId,
                entityName: data.entityName,
                current: 0,
                total: data.total,
                step: 'Iniciando...',
                percentage: 0,
                timestamp: data.timestamp,
              });
              break;

            case 'enrichment:progress':
              setProgress({
                entityType: data.entityType,
                entityId: data.entityId,
                entityName: data.entityName,
                current: data.current,
                total: data.total,
                step: data.step,
                details: data.details,
                percentage: Math.round((data.current / data.total) * 100),
                timestamp: data.timestamp,
              });
              break;

            case 'enrichment:completed':
              setProgress(null);
              // Agregar notificación si hubo actualizaciones
              if (data.bioUpdated || data.imagesUpdated || data.coverUpdated) {
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: `${data.entityId}-${Date.now()}`,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    entityName: data.entityName,
                    bioUpdated: data.bioUpdated,
                    imagesUpdated: data.imagesUpdated,
                    coverUpdated: data.coverUpdated,
                    timestamp: data.timestamp,
                    read: false,
                  },
                ]);
              }
              break;

            case 'enrichment:error':
              logger.error(`Enrichment error: ${data.entityName} - ${data.error}`);
              setProgress(null);
              break;

            case 'connected':
            case 'keepalive':
              // Ignore these events
              break;

            default:
              // Ignore other events (queue events, etc.)
              break;
          }
        } catch (err) {
          logger.error('[SSE] Failed to parse enrichment event:', err);
        }
      };

      eventSource.onerror = () => {
        logger.error('[SSE] Metadata enrichment connection error');
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

  /**
   * Marcar notificación como leída
   */
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  /**
   * Marcar todas como leídas
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  /**
   * Limpiar todas las notificaciones
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Obtener solo notificaciones no leídas
   */
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    progress,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
