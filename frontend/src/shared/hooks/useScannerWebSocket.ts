import { useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import WebSocketService from '../services/websocket.service';

/**
 * Estados del escaneo
 */
export enum ScanStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',
  AGGREGATING = 'aggregating',
  EXTRACTING_COVERS = 'extracting_covers',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Datos de progreso del scan
 */
export interface ScanProgress {
  scanId: string;
  status: ScanStatus;
  progress: number;
  filesScanned: number;
  totalFiles: number;
  tracksCreated: number;
  albumsCreated: number;
  artistsCreated: number;
  coversExtracted: number;
  errors: number;
  currentFile?: string;
  message?: string;
}

/**
 * Error del scan
 */
export interface ScanError {
  scanId: string;
  file: string;
  error: string;
  timestamp: string;
}

/**
 * Scan completado
 */
export interface ScanCompleted {
  scanId: string;
  totalFiles: number;
  tracksCreated: number;
  albumsCreated: number;
  artistsCreated: number;
  coversExtracted: number;
  errors: number;
  duration: number;
  timestamp: string;
}

/**
 * Hook para conectarse a los eventos de scanner via WebSocket
 *
 * @param scanId - ID del scan a monitorear
 * @param token - JWT token para autenticación
 * @returns Estado del scan y funciones de control
 *
 * @example
 * ```tsx
 * const { progress, errors, isCompleted, isConnected } = useScannerWebSocket(scanId, token);
 *
 * return (
 *   <div>
 *     <p>Progreso: {progress?.progress}%</p>
 *     <p>Archivos: {progress?.filesScanned}/{progress?.totalFiles}</p>
 *     <p>Tracks: {progress?.tracksCreated}</p>
 *   </div>
 * );
 * ```
 */
export function useScannerWebSocket(scanId: string | null, token: string | null) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [errors, setErrors] = useState<ScanError[]>([]);
  const [completed, setCompleted] = useState<ScanCompleted | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  /**
   * Pausar scan (solo admin)
   */
  const pauseScan = useCallback(() => {
    if (socketRef.current && scanId) {
      socketRef.current.emit('scanner:pause', { scanId });
    }
  }, [scanId]);

  /**
   * Cancelar scan (solo admin)
   */
  const cancelScan = useCallback((reason?: string) => {
    if (socketRef.current && scanId) {
      socketRef.current.emit('scanner:cancel', { scanId, reason });
    }
  }, [scanId]);

  /**
   * Resumir scan (solo admin)
   */
  const resumeScan = useCallback(() => {
    if (socketRef.current && scanId) {
      socketRef.current.emit('scanner:resume', { scanId });
    }
  }, [scanId]);

  useEffect(() => {
    // Si no hay scanId o token, no conectar
    if (!scanId || !token) {
      return;
    }

    // Conectar al namespace de scanner
    const wsService = WebSocketService;
    const socket = wsService.connect('scanner', token);
    socketRef.current = socket;

    // Event: Conectado
    const handleConnect = () => {
      setIsConnected(true);
      // Suscribirse al scan
      socket.emit('scanner:subscribe', { scanId });
    };

    // Event: Desconectado
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Event: Progreso del scan
    const handleProgress = (data: ScanProgress) => {
      setProgress(data);
    };

    // Event: Error en un archivo
    const handleError = (data: ScanError) => {
      setErrors((prev) => [...prev, data]);
    };

    // Event: Scan completado
    const handleCompleted = (data: ScanCompleted) => {
      setCompleted(data);
      setProgress((prev) => prev ? { ...prev, progress: 100, status: ScanStatus.COMPLETED } : null);
    };

    // Event: Subscripción confirmada
    const handleSubscribed = () => {
      // Subscribed to scan
    };

    // Registrar event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('scan:progress', handleProgress);
    socket.on('scan:error', handleError);
    socket.on('scan:completed', handleCompleted);
    socket.on('scanner:subscribed', handleSubscribed);

    // Si ya está conectado, suscribirse inmediatamente
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('scan:progress', handleProgress);
      socket.off('scan:error', handleError);
      socket.off('scan:completed', handleCompleted);
      socket.off('scanner:subscribed', handleSubscribed);

      // Desuscribirse del scan
      if (socket.connected) {
        socket.emit('scanner:unsubscribe', { scanId });
      }

      // No desconectamos el socket aquí para permitir múltiples hooks
      // El socket se desconectará cuando el componente principal se desmonte
    };
  }, [scanId, token]);

  return {
    progress,
    errors,
    completed,
    isConnected,
    isCompleted: completed !== null,
    pauseScan,
    cancelScan,
    resumeScan,
  };
}
