import { create } from 'zustand';

/**
 * Scan status enum
 */
export type ScanStatus =
  | 'pending'
  | 'scanning'
  | 'aggregating'
  | 'extracting_covers'
  | 'completed'
  | 'failed';

/**
 * Scan progress event
 */
export interface ScanProgressEvent {
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

interface ScanProgressState {
  activeScans: Map<string, ScanProgressEvent>;
  isConnected: boolean;

  // Actions
  updateScan: (event: ScanProgressEvent) => void;
  removeScan: (scanId: string) => void;
  setConnected: (connected: boolean) => void;
  clearAll: () => void;
}

export const useScanProgressStore = create<ScanProgressState>((set) => ({
  activeScans: new Map(),
  isConnected: false,

  updateScan: (event) =>
    set((state) => {
      const newMap = new Map(state.activeScans);
      newMap.set(event.scanId, event);
      return { activeScans: newMap };
    }),

  removeScan: (scanId) =>
    set((state) => {
      const newMap = new Map(state.activeScans);
      newMap.delete(scanId);
      return { activeScans: newMap };
    }),

  setConnected: (connected) => set({ isConnected: connected }),

  clearAll: () => set({ activeScans: new Map() }),
}));
