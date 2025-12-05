import { create } from 'zustand';

export interface LufsProgress {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  estimatedTimeRemaining: string | null;
}

interface LufsProgressState {
  // State
  lufsProgress: LufsProgress | null;

  // Actions
  setLufsProgress: (progress: LufsProgress | null) => void;
  clearLufsProgress: () => void;
}

/**
 * Store global para el progreso de análisis LUFS
 * Mantiene el estado entre navegaciones (no se resetea al cambiar de página)
 */
export const useLufsProgressStore = create<LufsProgressState>()((set) => ({
  lufsProgress: null,

  setLufsProgress: (progress) => set({ lufsProgress: progress }),

  clearLufsProgress: () => set({ lufsProgress: null }),
}));
