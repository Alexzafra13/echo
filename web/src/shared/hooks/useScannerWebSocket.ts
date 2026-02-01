import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';

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
 * Progreso del análisis LUFS
 */
export interface LufsProgress {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

/**
 * Progreso del análisis DJ (BPM, Key, Energy)
 */
export interface DjProgress {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
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
  const [lufsProgress, setLufsProgress] = useState<LufsProgress | null>(null);
  const [djProgress, setDjProgress] = useState<DjProgress | null>(null);

  // Handlers para eventos
  const handleProgress = useCallback((data: ScanProgress) => {
    setProgress(data);
  }, []);

  const handleError = useCallback((data: ScanError) => {
    setErrors((prev) => [...prev, data]);
  }, []);

  const handleCompleted = useCallback((data: ScanCompleted) => {
    setCompleted(data);
    setProgress((prev) =>
      prev ? { ...prev, progress: 100, status: ScanStatus.COMPLETED } : null
    );
  }, []);

  const handleLufsProgress = useCallback((data: LufsProgress) => {
    setLufsProgress(data);
  }, []);

  const handleDjProgress = useCallback((data: DjProgress) => {
    setDjProgress(data);
  }, []);

  // Eventos a registrar
  const events = useMemo(
    () => [
      { event: 'scan:progress', handler: handleProgress },
      { event: 'scan:error', handler: handleError },
      { event: 'scan:completed', handler: handleCompleted },
      { event: 'lufs:progress', handler: handleLufsProgress },
      { event: 'dj:progress', handler: handleDjProgress },
    ],
    [handleProgress, handleError, handleCompleted, handleLufsProgress, handleDjProgress]
  );

  // Callback cuando se conecta: suscribirse al scan
  const handleConnect = useCallback(() => {
    // Se suscribe después de conectar usando emit
  }, []);

  // Usar el hook base de WebSocket
  // Conectar siempre que haya token (para recibir eventos LUFS globales)
  const { isConnected, emit } = useWebSocketConnection({
    namespace: 'scanner',
    token,
    enabled: !!token,
    events,
    onConnect: handleConnect,
  });

  // Suscribirse al scan cuando se conecta
  useEffect(() => {
    if (isConnected && scanId) {
      emit('scanner:subscribe', { scanId });
    }

    return () => {
      if (isConnected && scanId) {
        emit('scanner:unsubscribe', { scanId });
      }
    };
  }, [isConnected, scanId, emit]);

  /**
   * Pausar scan (solo admin)
   */
  const pauseScan = useCallback(() => {
    if (scanId) {
      emit('scanner:pause', { scanId });
    }
  }, [scanId, emit]);

  /**
   * Cancelar scan (solo admin)
   */
  const cancelScan = useCallback(
    (reason?: string) => {
      if (scanId) {
        emit('scanner:cancel', { scanId, reason });
      }
    },
    [scanId, emit]
  );

  /**
   * Resumir scan (solo admin)
   */
  const resumeScan = useCallback(() => {
    if (scanId) {
      emit('scanner:resume', { scanId });
    }
  }, [scanId, emit]);

  return {
    progress,
    errors,
    completed,
    lufsProgress,
    djProgress,
    isConnected,
    isCompleted: completed !== null,
    pauseScan,
    cancelScan,
    resumeScan,
  };
}
