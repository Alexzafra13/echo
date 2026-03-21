import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@shared/hooks/useAuth';
import { notificationKeys } from './useNotifications';
import { logger } from '@shared/utils/logger';

/**
 * useNotificationSSE
 *
 * Se conecta al stream SSE de notificaciones del usuario.
 * Al recibir una notificación, invalida las cachés de React Query
 * para refrescar la lista y el contador de no leídas automáticamente.
 *
 * Usa auth por token en query param (EventSource no soporta headers).
 */
export function useNotificationSSE() {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Limpiar al cerrar sesión
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

          // Invalidar queries para refrescar lista y contador de no leídas
          queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
        } catch {
          // Ignorar errores de parseo
        }
      });

      es.addEventListener('keepalive', () => {
        // Keepalive silencioso - conexión activa
      });

      es.onerror = () => {
        logger.debug('[NotificationSSE] Connection error, will reconnect...');
        es.close();
        eventSourceRef.current = null;

        // Reconectar tras 5 segundos
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
