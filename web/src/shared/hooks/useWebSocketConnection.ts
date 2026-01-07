import { useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import WebSocketService from '../services/websocket.service';
import { logger } from '@shared/utils/logger';

export type WebSocketNamespace = 'scanner' | 'metadata' | 'federation';

// WebSocket events can receive various data types, so we use `any` intentionally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WebSocketEventHandler<T = any> {
  event: string;
  handler: (data: T) => void;
}

export interface UseWebSocketConnectionOptions {
  /** Namespace del WebSocket (scanner, metadata) */
  namespace: WebSocketNamespace;
  /** Token de autenticación */
  token: string | null;
  /** Si la conexión está habilitada (default: true si hay token) */
  enabled?: boolean;
  /** Eventos a registrar automáticamente */
  events?: WebSocketEventHandler[];
  /** Callback cuando se conecta */
  onConnect?: () => void;
  /** Callback cuando se desconecta */
  onDisconnect?: () => void;
}

export interface UseWebSocketConnectionReturn {
  /** Instancia del socket (null si no está conectado) */
  socket: Socket | null;
  /** Si está conectado al WebSocket */
  isConnected: boolean;
  /** Emitir un evento al servidor */
  emit: <T = unknown>(event: string, data?: T) => void;
  /** Registrar un listener para un evento */
  on: <T = unknown>(event: string, handler: (data: T) => void) => void;
  /** Remover un listener para un evento */
  off: <T = unknown>(event: string, handler: (data: T) => void) => void;
}

/**
 * Hook base para conexiones WebSocket
 *
 * Maneja la conexión, reconexión, y cleanup automático.
 * Los hooks específicos (useScannerWebSocket, useMetadataEnrichment) usan este base.
 *
 * @param options - Opciones de configuración
 * @returns Estado de conexión y funciones de control
 *
 * @example
 * ```tsx
 * const { socket, isConnected, emit, on, off } = useWebSocketConnection({
 *   namespace: 'metadata',
 *   token: authToken,
 *   onConnect: () => console.log('Connected!'),
 * });
 *
 * useEffect(() => {
 *   if (!socket) return;
 *   on('some:event', handleEvent);
 *   return () => off('some:event', handleEvent);
 * }, [socket]);
 * ```
 */
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

  // Mantener referencia actualizada de events
  eventsRef.current = events;

  /**
   * Emitir un evento al servidor
   */
  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  /**
   * Registrar un listener para un evento
   */
  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler as (...args: unknown[]) => void);
    }
  }, []);

  /**
   * Remover un listener para un evento
   */
  const off = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler as (...args: unknown[]) => void);
    }
  }, []);

  useEffect(() => {
    // No conectar si no está habilitado o no hay token
    if (!enabled || !token) {
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    try {
      // Conectar al namespace
      const socket = WebSocketService.connect(namespace, token);
      socketRef.current = socket;

      // Handler para conexión
      const handleConnect = () => {
        setIsConnected(true);
        onConnect?.();
      };

      // Handler para desconexión
      const handleDisconnect = () => {
        setIsConnected(false);
        onDisconnect?.();
      };

      // Registrar handlers de conexión
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      // Registrar eventos pasados en options
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
