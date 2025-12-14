import { useState, useEffect, useCallback } from 'react';
import { useLufsProgressStore, type LufsProgress } from '@shared/store/lufsProgressStore';
import { useAuthStore } from '@shared/store/authStore';

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
 * Scanner event types
 */
type ScannerEventType = 'progress' | 'error' | 'completed' | 'lufs' | 'library';

interface ScannerEventData {
  type: ScannerEventType;
  data: ScanProgress | ScanError | ScanCompleted | LufsProgress | LibraryChange;
}

type ScannerEventHandler = (event: ScannerEventData) => void;

/**
 * Singleton manager for the Scanner SSE connection.
 * Ensures only one EventSource connection exists regardless of how many
 * hooks are subscribed. This prevents multiple connections to the same
 * endpoint which can cause performance issues and connection limits.
 */
class ScannerSSEManager {
  private eventSource: EventSource | null = null;
  private handlers: Set<ScannerEventHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private isConnectedState = false;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private currentToken: string | null = null;

  setToken(token: string | null) {
    this.currentToken = token;
  }

  connect() {
    // Already connected
    if (this.eventSource) {
      return;
    }

    // Don't connect without token (admin endpoints require auth)
    if (!this.currentToken) {
      if (import.meta.env.DEV) {
        console.log('[ScannerSSE] No token available, skipping connection');
      }
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      // Send token as query parameter (EventSource can't send headers)
      const sseUrl = `${baseUrl}/scanner/stream?token=${encodeURIComponent(this.currentToken)}`;

      if (import.meta.env.DEV) {
        console.log('[ScannerSSE] Singleton connecting to:', `${baseUrl}/scanner/stream`);
      }

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        if (import.meta.env.DEV) {
          console.log('[ScannerSSE] Singleton connected');
        }
        this.isConnectedState = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
      };

      this.eventSource.onerror = () => {
        if (import.meta.env.DEV) {
          console.error('[ScannerSSE] Singleton connection error');
        }
        this.isConnectedState = false;
        this.notifyConnectionChange(false);
        this.eventSource?.close();
        this.eventSource = null;

        // Only reconnect if we still have subscribers
        if (this.handlers.size > 0) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectAttempts++;

          if (import.meta.env.DEV) {
            console.log(`[ScannerSSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          }

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        }
      };

      // Handle different event types
      this.eventSource.addEventListener('scan:progress', (event) => {
        try {
          const data = JSON.parse(event.data) as ScanProgress;
          this.notifyHandlers({ type: 'progress', data });
        } catch (e) {
          console.error('[ScannerSSE] Error parsing scan:progress:', e);
        }
      });

      this.eventSource.addEventListener('scan:error', (event) => {
        try {
          const data = JSON.parse(event.data) as ScanError;
          this.notifyHandlers({ type: 'error', data });
        } catch (e) {
          console.error('[ScannerSSE] Error parsing scan:error:', e);
        }
      });

      this.eventSource.addEventListener('scan:completed', (event) => {
        try {
          const data = JSON.parse(event.data) as ScanCompleted;
          this.notifyHandlers({ type: 'completed', data });
        } catch (e) {
          console.error('[ScannerSSE] Error parsing scan:completed:', e);
        }
      });

      this.eventSource.addEventListener('lufs:progress', (event) => {
        try {
          const data = JSON.parse(event.data) as LufsProgress;
          this.notifyHandlers({ type: 'lufs', data });
        } catch (e) {
          console.error('[ScannerSSE] Error parsing lufs:progress:', e);
        }
      });

      this.eventSource.addEventListener('library:change', (event) => {
        try {
          const data = JSON.parse(event.data) as LibraryChange;
          this.notifyHandlers({ type: 'library', data });
        } catch (e) {
          console.error('[ScannerSSE] Error parsing library:change:', e);
        }
      });

    } catch (err) {
      console.error('[ScannerSSE] Failed to create EventSource:', err);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isConnectedState = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionChange(false);
  }

  subscribe(handler: ScannerEventHandler) {
    this.handlers.add(handler);

    // Connect if this is the first subscriber
    if (this.handlers.size === 1) {
      this.connect();
    }

    return () => {
      this.handlers.delete(handler);
      // Disconnect if no more subscribers
      if (this.handlers.size === 0) {
        this.disconnect();
      }
    };
  }

  subscribeToConnection(listener: (connected: boolean) => void) {
    this.connectionListeners.add(listener);
    // Immediately notify of current state
    listener(this.isConnectedState);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  private notifyHandlers(event: ScannerEventData) {
    this.handlers.forEach((handler) => handler(event));
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionListeners.forEach((listener) => listener(connected));
  }

  isConnected() {
    return this.isConnectedState;
  }

  getSubscriberCount() {
    return this.handlers.size;
  }
}

// Singleton instance
const scannerSSEManager = new ScannerSSEManager();

/**
 * Hook para conectarse a los eventos de scanner via SSE
 *
 * Uses a shared singleton EventSource connection so multiple components
 * can subscribe without creating duplicate connections.
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
  const [isConnected, setIsConnected] = useState(scannerSSEManager.isConnected());

  const accessToken = useAuthStore((state) => state.accessToken);
  const lufsProgress = useLufsProgressStore((state) => state.lufsProgress);
  const setLufsProgress = useLufsProgressStore((state) => state.setLufsProgress);

  // Update token in manager when it changes
  useEffect(() => {
    scannerSSEManager.setToken(accessToken);
  }, [accessToken]);

  const handleEvent = useCallback((event: ScannerEventData) => {
    switch (event.type) {
      case 'progress': {
        const data = event.data as ScanProgress;
        if (!scanId || data.scanId === scanId) {
          setProgress(data);
        }
        break;
      }
      case 'error': {
        const data = event.data as ScanError;
        if (!scanId || data.scanId === scanId) {
          setErrors((prev) => [...prev, data]);
        }
        break;
      }
      case 'completed': {
        const data = event.data as ScanCompleted;
        if (!scanId || data.scanId === scanId) {
          setCompleted(data);
          setProgress((prev) =>
            prev ? { ...prev, progress: 100, status: ScanStatus.COMPLETED } : null
          );
        }
        break;
      }
      case 'lufs': {
        const data = event.data as LufsProgress;
        setLufsProgress(data);
        break;
      }
      case 'library': {
        const data = event.data as LibraryChange;
        setLibraryChanges((prev) => [...prev, data]);
        break;
      }
    }
  }, [scanId, setLufsProgress]);

  useEffect(() => {
    // Subscribe to events
    const unsubscribeEvents = scannerSSEManager.subscribe(handleEvent);

    // Subscribe to connection state changes
    const unsubscribeConnection = scannerSSEManager.subscribeToConnection(setIsConnected);

    return () => {
      unsubscribeEvents();
      unsubscribeConnection();
    };
  }, [handleEvent]);

  // Pause SSE when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't disconnect - other components might still need it
        // The manager will disconnect when all subscribers are gone
      } else if (!scannerSSEManager.isConnected() && scannerSSEManager.getSubscriberCount() > 0) {
        scannerSSEManager.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
 * Uses the shared singleton SSE connection
 */
export function useLufsProgressSSE() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const lufsProgress = useLufsProgressStore((state) => state.lufsProgress);
  const setLufsProgress = useLufsProgressStore((state) => state.setLufsProgress);
  const [isConnected, setIsConnected] = useState(scannerSSEManager.isConnected());

  // Update token in manager when it changes
  useEffect(() => {
    scannerSSEManager.setToken(accessToken);
  }, [accessToken]);

  const handleEvent = useCallback((event: ScannerEventData) => {
    if (event.type === 'lufs') {
      setLufsProgress(event.data as LufsProgress);
    }
  }, [setLufsProgress]);

  useEffect(() => {
    const unsubscribeEvents = scannerSSEManager.subscribe(handleEvent);
    const unsubscribeConnection = scannerSSEManager.subscribeToConnection(setIsConnected);

    return () => {
      unsubscribeEvents();
      unsubscribeConnection();
    };
  }, [handleEvent]);

  return {
    lufsProgress,
    isConnected,
  };
}
