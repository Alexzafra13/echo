import { useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import WebSocketService from '../services/websocket.service';
import { logger } from '@shared/utils/logger';

export type WebSocketNamespace = 'scanner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WebSocketEventHandler<T = any> {
  event: string;
  handler: (data: T) => void;
}

export interface UseWebSocketConnectionOptions {
  namespace: WebSocketNamespace;
  token: string | null;
  enabled?: boolean;
  events?: WebSocketEventHandler[];
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseWebSocketConnectionReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: <T = unknown>(event: string, data?: T) => void;
  on: <T = unknown>(event: string, handler: (data: T) => void) => void;
  off: <T = unknown>(event: string, handler: (data: T) => void) => void;
}

export function useWebSocketConnection(
  options: UseWebSocketConnectionOptions
): UseWebSocketConnectionReturn {
  const {
    namespace,
    token,
    enabled = true,
    events = [],
    onConnect,
    onDisconnect,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const eventsRef = useRef(events);

  eventsRef.current = events;

  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler as (...args: unknown[]) => void);
    }
  }, []);

  const off = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler as (...args: unknown[]) => void);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !token) {
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    try {
      const socket = WebSocketService.connect(namespace, token);
      socketRef.current = socket;

      const handleConnect = () => {
        setIsConnected(true);
        onConnect?.();
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        onDisconnect?.();
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      eventsRef.current.forEach(({ event, handler }) => {
        socket.on(event, handler as (...args: unknown[]) => void);
      });

      // Si ya está conectado, ejecutar handleConnect
      if (socket.connected) {
        handleConnect();
      }

      // Cleanup
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);

        // Remover eventos registrados
        eventsRef.current.forEach(({ event, handler }) => {
          socket.off(event, handler as (...args: unknown[]) => void);
        });

        // No desconectamos el socket para permitir múltiples hooks
        // El WebSocketService maneja la conexión compartida
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error(`[useWebSocketConnection] Error connecting to ${namespace}:`, error);
      }
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [namespace, token, enabled, onConnect, onDisconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
  };
}
