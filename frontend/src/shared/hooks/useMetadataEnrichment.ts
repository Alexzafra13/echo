import { useEffect, useState, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import WebSocketService from '../services/websocket.service';

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
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  /**
   * Marcar notificación como leída
   */
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  /**
   * Marcar todas como leídas
   */
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  /**
   * Limpiar todas las notificaciones
   */
  const clearAll = () => {
    setNotifications([]);
  };

  /**
   * Obtener solo notificaciones no leídas
   */
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    // Solo conectar si es admin y tiene token
    if (!token || !isAdmin) {
      return;
    }

    // Conectar al namespace de metadata
    const wsService = WebSocketService;
    const socket = wsService.connect('metadata', token);
    socketRef.current = socket;

    // Event: Conectado
    const handleConnect = () => {
      setIsConnected(true);
    };

    // Event: Desconectado
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Event: Enriquecimiento iniciado
    const handleStarted = (data: {
      entityType: 'artist' | 'album';
      entityId: string;
      entityName: string;
      total: number;
      timestamp: string;
    }) => {
      setProgress({
        ...data,
        current: 0,
        step: 'Iniciando...',
        percentage: 0,
      });
    };

    // Event: Progreso del enriquecimiento
    const handleProgress = (data: EnrichmentProgress) => {
      setProgress(data);
    };

    // Event: Enriquecimiento completado
    const handleCompleted = (data: {
      entityType: 'artist' | 'album';
      entityId: string;
      entityName: string;
      bioUpdated?: boolean;
      imagesUpdated?: boolean;
      coverUpdated?: boolean;
      duration: number;
      timestamp: string;
    }) => {
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
    };

    // Event: Error en el enriquecimiento
    const handleError = (data: {
      entityType: 'artist' | 'album';
      entityId: string;
      entityName: string;
      error: string;
      timestamp: string;
    }) => {
      console.error(`❌ Enrichment error: ${data.entityName} - ${data.error}`);
      setProgress(null);
    };

    // Registrar event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('enrichment:started', handleStarted);
    socket.on('enrichment:progress', handleProgress);
    socket.on('enrichment:completed', handleCompleted);
    socket.on('enrichment:error', handleError);

    // Si ya está conectado, ejecutar handleConnect inmediatamente
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('enrichment:started', handleStarted);
      socket.off('enrichment:progress', handleProgress);
      socket.off('enrichment:completed', handleCompleted);
      socket.off('enrichment:error', handleError);

      // No desconectamos el socket aquí para permitir múltiples hooks
      // El socket se desconectará cuando el componente principal se desmonte
    };
  }, [token, isAdmin]);

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
