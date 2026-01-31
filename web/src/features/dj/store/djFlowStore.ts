/**
 * DJ Flow Store
 *
 * Zustand store for DJ Flow mode settings and state.
 * Persists user preferences to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DjFlowSettings, DjAnalysis, TransitionResult } from '../types';

const STORE_VERSION = 1;

interface DjFlowState {
  // Settings (persisted)
  settings: DjFlowSettings;

  // Runtime state (not persisted)
  analysisCache: Map<string, DjAnalysis>;
  transitionCache: Map<string, TransitionResult>;
  isAnalyzing: boolean;
  analyzingTrackId: string | null;

  // Settings actions
  setDjFlowEnabled: (enabled: boolean) => void;
  setReorderQueue: (enabled: boolean) => void;
  setSyncBpm: (enabled: boolean) => void;
  setTransitionBeats: (beats: 8 | 16 | 32) => void;
  setPriority: (priority: 'harmonic' | 'energy' | 'bpm') => void;
  toggleDjFlow: () => void;

  // Cache actions
  setAnalysis: (trackId: string, analysis: DjAnalysis) => void;
  setTransition: (key: string, transition: TransitionResult) => void;
  getAnalysis: (trackId: string) => DjAnalysis | undefined;
  getTransition: (trackAId: string, trackBId: string) => TransitionResult | undefined;
  clearCache: () => void;

  // Analysis state actions
  setIsAnalyzing: (isAnalyzing: boolean, trackId?: string | null) => void;
}

const DEFAULT_SETTINGS: DjFlowSettings = {
  enabled: false,
  reorderQueue: true,
  syncBpm: true,
  transitionBeats: 16,
  priority: 'harmonic',
};

export const useDjFlowStore = create<DjFlowState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: DEFAULT_SETTINGS,
      analysisCache: new Map(),
      transitionCache: new Map(),
      isAnalyzing: false,
      analyzingTrackId: null,

      // Settings actions
      setDjFlowEnabled: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, enabled },
        })),

      setReorderQueue: (reorderQueue) =>
        set((state) => ({
          settings: { ...state.settings, reorderQueue },
        })),

      setSyncBpm: (syncBpm) =>
        set((state) => ({
          settings: { ...state.settings, syncBpm },
        })),

      setTransitionBeats: (transitionBeats) =>
        set((state) => ({
          settings: { ...state.settings, transitionBeats },
        })),

      setPriority: (priority) =>
        set((state) => ({
          settings: { ...state.settings, priority },
        })),

      toggleDjFlow: () =>
        set((state) => ({
          settings: { ...state.settings, enabled: !state.settings.enabled },
        })),

      // Cache actions
      setAnalysis: (trackId, analysis) =>
        set((state) => {
          const newCache = new Map(state.analysisCache);
          newCache.set(trackId, analysis);
          return { analysisCache: newCache };
        }),

      setTransition: (key, transition) =>
        set((state) => {
          const newCache = new Map(state.transitionCache);
          newCache.set(key, transition);
          return { transitionCache: newCache };
        }),

      getAnalysis: (trackId) => get().analysisCache.get(trackId),

      getTransition: (trackAId, trackBId) => {
        const key = `${trackAId}-${trackBId}`;
        return get().transitionCache.get(key);
      },

      clearCache: () =>
        set({
          analysisCache: new Map(),
          transitionCache: new Map(),
        }),

      // Analysis state actions
      setIsAnalyzing: (isAnalyzing, trackId = null) =>
        set({
          isAnalyzing,
          analyzingTrackId: trackId,
        }),
    }),
    {
      name: 'echo-dj-flow',
      version: STORE_VERSION,

      // Only persist settings, not the cache
      partialize: (state) => ({
        settings: state.settings,
      }),

      // Handle migrations
      migrate: (persistedState, version) => {
        if (version === 0 || !persistedState) {
          return { settings: DEFAULT_SETTINGS };
        }
        return persistedState as { settings: DjFlowSettings };
      },

      // Merge persisted state with initial state
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<DjFlowState> || {}),
      }),
    }
  )
);

// Selector hooks for common use cases
export const useDjFlowEnabled = () =>
  useDjFlowStore((state) => state.settings.enabled);

export const useDjFlowSettings = () =>
  useDjFlowStore((state) => state.settings);

export const useToggleDjFlow = () =>
  useDjFlowStore((state) => state.toggleDjFlow);
