import { useState, useCallback, useEffect } from 'react';
import { useMetadataSSE } from './useMetadataSSE';
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

interface EnrichmentCompletedData {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  bioUpdated?: boolean;
  imagesUpdated?: boolean;
  coverUpdated?: boolean;
  duration: number;
  timestamp: string;
}

/**
 * Hook para conectarse a los eventos de metadata enrichment via SSE
 *
 * @param token - JWT token (unused, kept for API compatibility - SSE handles auth)
 * @param isAdmin - Si el usuario es admin (solo admins reciben notificaciones)
 * @returns Estado de enriquecimiento y notificaciones
 */
export function useMetadataEnrichment(_token: string | null, isAdmin: boolean) {
  const [notifications, setNotifications] = useState<EnrichmentNotification[]>([]);
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSource = useMetadataSSE();

  useEffect(() => {
    if (!eventSource || !isAdmin) {
      setIsConnected(false);
      return;
    }

    setIsConnected(eventSource.readyState === EventSource.OPEN);

    const onOpen = () => setIsConnected(true);
    const onError = () => setIsConnected(false);

    const handleStarted = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setProgress({
        ...data,
        current: 0,
        step: 'Iniciando...',
        percentage: 0,
      });
    };

    const handleProgress = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setProgress(data);
    };

    const handleCompleted = (e: MessageEvent) => {
      const data: EnrichmentCompletedData = JSON.parse(e.data);
      setProgress(null);

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
    };

    const handleError = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (import.meta.env.DEV) {
        logger.error(`Enrichment error: ${data.entityName} - ${data.error}`);
      }
      setProgress(null);
    };

    eventSource.addEventListener('open', onOpen);
    eventSource.addEventListener('error', onError);
    eventSource.addEventListener('enrichment:started', handleStarted);
    eventSource.addEventListener('enrichment:progress', handleProgress);
    eventSource.addEventListener('enrichment:completed', handleCompleted);
    eventSource.addEventListener('enrichment:error', handleError);

    return () => {
      eventSource.removeEventListener('open', onOpen);
      eventSource.removeEventListener('error', onError);
      eventSource.removeEventListener('enrichment:started', handleStarted);
      eventSource.removeEventListener('enrichment:progress', handleProgress);
      eventSource.removeEventListener('enrichment:completed', handleCompleted);
      eventSource.removeEventListener('enrichment:error', handleError);
    };
  }, [eventSource, isAdmin]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

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
