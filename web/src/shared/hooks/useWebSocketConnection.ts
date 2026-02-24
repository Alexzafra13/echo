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
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;

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

  // Connect socket when namespace/token/enabled changes
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
        onConnectRef.current?.();
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        onDisconnectRef.current?.();
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      if (socket.connected) {
        handleConnect();
      }

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error(`[useWebSocketConnection] Error connecting to ${namespace}:`, error);
      }
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [namespace, token, enabled]);

  // Register/unregister event handlers separately so they can be updated
  // without reconnecting the socket. Captures the exact handlers at registration
  // time to ensure cleanup removes the same references that were added.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || events.length === 0) return;

    // Capture the current handlers for deterministic cleanup
    const registeredHandlers = events.map(({ event, handler }) => {
      const castHandler = handler as (...args: unknown[]) => void;
      socket.on(event, castHandler);
      return { event, handler: castHandler };
    });

    return () => {
      registeredHandlers.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
    };
  }, [events]);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
  };
}
