import { create } from 'zustand';

/**
 * Album import progress event
 */
export interface ImportProgressEvent {
  importId: string;
  userId: string;
  albumName: string;
  artistName: string;
  serverId: string;
  remoteAlbumId: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number;
  currentTrack: number;
  totalTracks: number;
  downloadedSize: number;
  totalSize: number;
  error?: string;
}

interface ImportProgressState {
  activeImports: Map<string, ImportProgressEvent>;
  isConnected: boolean;

  // Actions
  updateImport: (event: ImportProgressEvent) => void;
  removeImport: (importId: string) => void;
  setConnected: (connected: boolean) => void;
  clearAll: () => void;
}

export const useImportProgressStore = create<ImportProgressState>((set) => ({
  activeImports: new Map(),
  isConnected: false,

  updateImport: (event) =>
    set((state) => {
      const newMap = new Map(state.activeImports);
      newMap.set(event.importId, event);
      return { activeImports: newMap };
    }),

  removeImport: (importId) =>
    set((state) => {
      const newMap = new Map(state.activeImports);
      newMap.delete(importId);
      return { activeImports: newMap };
    }),

  setConnected: (connected) => set({ isConnected: connected }),

  clearAll: () => set({ activeImports: new Map() }),
}));
