import { create } from 'zustand';

/**
 * DJ Analysis progress event from WebSocket
 */
export interface DjProgressEvent {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

interface DjProgressState {
  progress: DjProgressEvent | null;
  isConnected: boolean;

  // Actions
  updateProgress: (event: DjProgressEvent) => void;
  setConnected: (connected: boolean) => void;
  clear: () => void;
}

export const useDjProgressStore = create<DjProgressState>((set) => ({
  progress: null,
  isConnected: false,

  updateProgress: (event: DjProgressEvent) => set({ progress: event }),

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  clear: () => set({ progress: null }),
}));
