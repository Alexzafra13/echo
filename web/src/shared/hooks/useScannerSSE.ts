import { useState, useEffect, useCallback, useRef } from 'react';
import { useLufsProgressStore, type LufsProgress } from '@shared/store/lufsProgressStore';

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
 * Library change from file watcher
 */
export interface LibraryChange {
  type: string;
  trackId?: string;
  trackTitle?: string;
  albumId?: string;
  albumDeleted?: boolean;
  artistId?: string;
  artistDeleted?: boolean;
  timestamp: string;
}

// Re-export for convenience
export type { LufsProgress } from '@shared/store/lufsProgressStore';

/**
 * Hook para conectarse a los eventos de scanner via SSE
 *
 * @param scanId - ID del scan a monitorear (opcional, para filtrar eventos)
 * @returns Estado del scan y conexión
 *
 * @example
 * ```tsx
 * const { progress, errors, isCompleted, isConnected } = useScannerSSE(scanId);
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
export function useScannerSSE(scanId?: string | null) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [errors, setErrors] = useState<ScanError[]>([]);
  const [completed, setCompleted] = useState<ScanCompleted | null>(null);
  const [libraryChanges, setLibraryChanges] = useState<LibraryChange[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const lufsProgress = useLufsProgressStore((state) => state.lufsProgress);
  const setLufsProgress = useLufsProgressStore((state) => state.setLufsProgress);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build SSE URL
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const sseUrl = `${baseUrl}/scanner/stream`;

    if (import.meta.env.DEV) {
      console.log('[ScannerSSE] Connecting to:', sseUrl);
    }

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (import.meta.env.DEV) {
        console.log('[ScannerSSE] Connected');
      }
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = (error) => {
      if (import.meta.env.DEV) {
        console.error('[ScannerSSE] Error:', error);
      }
      setIsConnected(false);
      eventSource.close();

      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      if (import.meta.env.DEV) {
        console.log(`[ScannerSSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
      }

      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    // Handle different event types
    eventSource.addEventListener('scan:progress', (event) => {
      try {
        const data = JSON.parse(event.data) as ScanProgress;
        // Filter by scanId if provided
        if (!scanId || data.scanId === scanId) {
          setProgress(data);
        }
      } catch (e) {
        console.error('[ScannerSSE] Error parsing scan:progress:', e);
      }
    });

    eventSource.addEventListener('scan:error', (event) => {
      try {
        const data = JSON.parse(event.data) as ScanError;
        if (!scanId || data.scanId === scanId) {
          setErrors((prev) => [...prev, data]);
        }
      } catch (e) {
        console.error('[ScannerSSE] Error parsing scan:error:', e);
      }
    });

    eventSource.addEventListener('scan:completed', (event) => {
      try {
        const data = JSON.parse(event.data) as ScanCompleted;
        if (!scanId || data.scanId === scanId) {
          setCompleted(data);
          setProgress((prev) =>
            prev ? { ...prev, progress: 100, status: ScanStatus.COMPLETED } : null
          );
        }
      } catch (e) {
        console.error('[ScannerSSE] Error parsing scan:completed:', e);
      }
    });

    eventSource.addEventListener('lufs:progress', (event) => {
      try {
        const data = JSON.parse(event.data) as LufsProgress;
        setLufsProgress(data);
      } catch (e) {
        console.error('[ScannerSSE] Error parsing lufs:progress:', e);
      }
    });

    eventSource.addEventListener('library:change', (event) => {
      try {
        const data = JSON.parse(event.data) as LibraryChange;
        setLibraryChanges((prev) => [...prev, data]);
      } catch (e) {
        console.error('[ScannerSSE] Error parsing library:change:', e);
      }
    });

    // Handle generic messages (fallback)
    eventSource.onmessage = (event) => {
      if (import.meta.env.DEV) {
        console.log('[ScannerSSE] Generic message:', event.data);
      }
    };
  }, [scanId, setLufsProgress]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Pause SSE when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          setIsConnected(false);
        }
      } else {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect]);

  return {
    progress,
    errors,
    completed,
    lufsProgress,
    libraryChanges,
    isConnected,
    isCompleted: completed !== null,
  };
}

/**
 * Hook global para escuchar solo el progreso de LUFS
 * Usa el mismo SSE stream pero solo actualiza el store de LUFS
 */
export function useLufsProgressSSE() {
  const { lufsProgress, isConnected } = useScannerSSE();

  return {
    lufsProgress,
    isConnected,
  };
}
