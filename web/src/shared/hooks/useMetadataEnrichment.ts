import { useState, useCallback, useMemo } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';

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

interface EnrichmentStartedData {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  total: number;
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

interface EnrichmentErrorData {
  entityType: 'artist' | 'album';
  entityId: string;
  entityName: string;
  error: string;
  timestamp: string;
}

/**
 * Hook para conectarse a los eventos de metadata enrichment via WebSocket
 *
 * @param token - JWT token para autenticación
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

  // Handlers para eventos
  const handleStarted = useCallback((data: EnrichmentStartedData) => {
    setProgress({
      ...data,
      current: 0,
      step: 'Iniciando...',
      percentage: 0,
    });
  }, []);

  const handleProgress = useCallback((data: EnrichmentProgress) => {
    setProgress(data);
  }, []);

  const handleCompleted = useCallback((data: EnrichmentCompletedData) => {
    // Limpiar progreso
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
  }, []);

  const handleError = useCallback((data: EnrichmentErrorData) => {
    if (import.meta.env.DEV) {
      console.error(`❌ Enrichment error: ${data.entityName} - ${data.error}`);
    }
    setProgress(null);
  }, []);

  // Eventos a registrar
  const events = useMemo(
    () => [
      { event: 'enrichment:started', handler: handleStarted },
      { event: 'enrichment:progress', handler: handleProgress },
      { event: 'enrichment:completed', handler: handleCompleted },
      { event: 'enrichment:error', handler: handleError },
    ],
    [handleStarted, handleProgress, handleCompleted, handleError]
  );

  // Usar el hook base de WebSocket
  const { isConnected } = useWebSocketConnection({
    namespace: 'metadata',
    token,
    enabled: !!token && isAdmin,
    events,
  });

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
