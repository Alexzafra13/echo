import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { WebSocketService } from '@shared/services/websocket.service';
import { useAuthStore } from '@shared/store';
import { useSessionStore } from '../store/sessionStore';
import { useSessionPlaybackSync } from './useSessionPlaybackSync';
import { logger } from '@shared/utils/logger';

const NAMESPACE = 'listening-sessions';
const SESSION_KEY = 'listening-session';

/**
 * Hook principal de WebSocket para sesiones de escucha.
 * Gestiona la conexion, los eventos de sesion, y la sincronizacion de reproduccion.
 */
export function useSessionSocket(sessionId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const myRole = useSessionStore((s) => s.myRole);
  const isHost = myRole === 'host';

  useEffect(() => {
    if (!sessionId || !token) return;

    const wsService = WebSocketService.getInstance();
    const ws = wsService.connect(NAMESPACE, token);
    socketRef.current = ws;
    setSocket(ws);

    ws.on('connect', () => {
      setIsConnected(true);
      ws.emit('session:join', { sessionId });
      logger.info('[SessionSocket] Conectado a sesion', sessionId);
    });

    ws.on('disconnect', () => {
      setIsConnected(false);
    });

    ws.on('session:queue-updated', (data: { queue: unknown[] }) => {
      useSessionStore.getState().updateQueue(data.queue as never[]);
    });

    ws.on('session:track-changed', (data: { trackId: string; position: number }) => {
      useSessionStore.getState().updateCurrentTrack(data.trackId, data.position);
    });

    ws.on('session:participant-joined', () => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, sessionId] });
    });

    ws.on('session:participant-left', () => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, sessionId] });
    });

    ws.on('session:participant-role-changed', (data: { userId: string; role: string }) => {
      if (data.userId === userId) {
        useSessionStore.getState().setMyRole(data.role as 'host' | 'dj' | 'listener');
      }
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, sessionId] });
    });

    ws.on('session:ended', () => {
      logger.info('[SessionSocket] Sesion terminada');
      useSessionStore.getState().clearActiveSession();
    });

    if (ws.connected) {
      setIsConnected(true);
      ws.emit('session:join', { sessionId });
    }

    return () => {
      ws.emit('session:leave', { sessionId });
      ws.off('connect');
      ws.off('disconnect');
      ws.off('session:queue-updated');
      ws.off('session:track-changed');
      ws.off('session:participant-joined');
      ws.off('session:participant-left');
      ws.off('session:participant-role-changed');
      ws.off('session:ended');
      wsService.disconnect(NAMESPACE);
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [sessionId, token, userId, queryClient]);

  // Sincronizacion de reproduccion
  useSessionPlaybackSync(socket, sessionId, isHost);

  return { isConnected };
}
