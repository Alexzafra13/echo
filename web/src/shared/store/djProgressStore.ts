import { create } from 'zustand';

export interface DjProgress {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

interface DjProgressState {
  // State
  djProgress: DjProgress | null;

  // Actions
  setDjProgress: (progress: DjProgress | null) => void;
  clearDjProgress: () => void;
}

/**
 * Store global para el progreso de análisis DJ (BPM, Key, Energy)
 * Mantiene el estado entre navegaciones (no se resetea al cambiar de página)
 */
export const useDjProgressStore = create<DjProgressState>()((set) => ({
  djProgress: null,

  setDjProgress: (progress) => set({ djProgress: progress }),

  clearDjProgress: () => set({ djProgress: null }),
}));
