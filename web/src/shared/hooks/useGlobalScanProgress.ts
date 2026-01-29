import { useCallback, useMemo } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { useAuthStore } from '@shared/store';
import {
  useScanProgressStore,
  type ScanProgressEvent,
} from '@shared/store/scanProgressStore';

const COMPLETED_DISPLAY_DURATION = 5000; // 5 seconds

interface ScanCompletedEvent {
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
 * Global hook for scan progress
 * Connects to scanner WebSocket and updates global store
 * State persists across navigation
 */
export function useGlobalScanProgress() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { activeScans, updateScan, removeScan, setConnected } =
    useScanProgressStore();

  // Handle progress events
  const handleProgress = useCallback(
    (data: ScanProgressEvent) => {
      updateScan(data);

      // Auto-remove completed/failed scans after delay
      if (data.status === 'completed' || data.status === 'failed') {
        setTimeout(() => {
          removeScan(data.scanId);
        }, COMPLETED_DISPLAY_DURATION);
      }
    },
    [updateScan, removeScan]
  );

  // Handle completed events
  const handleCompleted = useCallback(
    (data: ScanCompletedEvent) => {
      // Update with completed status
      updateScan({
        scanId: data.scanId,
        status: 'completed',
        progress: 100,
        filesScanned: data.totalFiles,
        totalFiles: data.totalFiles,
        tracksCreated: data.tracksCreated,
        albumsCreated: data.albumsCreated,
        artistsCreated: data.artistsCreated,
        coversExtracted: data.coversExtracted,
        errors: data.errors,
        message: `Scan completed in ${Math.round(data.duration / 1000)}s`,
      });

      // Auto-remove after delay
      setTimeout(() => {
        removeScan(data.scanId);
      }, COMPLETED_DISPLAY_DURATION);
    },
    [updateScan, removeScan]
  );

  // Events to listen for
  const events = useMemo(
    () => [
      { event: 'scan:progress', handler: handleProgress },
      { event: 'scan:completed', handler: handleCompleted },
    ],
    [handleProgress, handleCompleted]
  );

  // Connect callbacks
  const handleConnect = useCallback(() => {
    setConnected(true);
  }, [setConnected]);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
  }, [setConnected]);

  // Connect to scanner WebSocket
  const { isConnected } = useWebSocketConnection({
    namespace: 'scanner',
    token: accessToken,
    enabled: !!accessToken,
    events,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  // Convert Map to array for easier consumption
  const scans = useMemo(() => Array.from(activeScans.values()), [activeScans]);

  // Check if any scan is active (not completed/failed)
  const hasActiveScans = useMemo(
    () =>
      scans.some(
        (scan) => scan.status !== 'completed' && scan.status !== 'failed'
      ),
    [scans]
  );

  return {
    scans,
    hasActiveScans,
    hasScans: scans.length > 0,
    isConnected,
  };
}
