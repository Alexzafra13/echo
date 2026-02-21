import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CrossfadeSettings, NormalizationSettings, AutoplaySettings } from '../types';

// Incrementar al cambiar la estructura del estado persistido
const STORE_VERSION = 2;

export type PlayerPreference = 'dynamic' | 'sidebar' | 'footer';

interface PlayerSettingsState {
  playerPreference: PlayerPreference;
  crossfade: CrossfadeSettings;
  normalization: NormalizationSettings;
  autoplay: AutoplaySettings;

  setPlayerPreference: (preference: PlayerPreference) => void;
  setCrossfadeEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;
  setCrossfadeSmartMode: (enabled: boolean) => void;
  setCrossfadeTempoMatch: (tempoMatch: boolean) => void;
  setNormalizationEnabled: (enabled: boolean) => void;
  setNormalizationTargetLufs: (targetLufs: -14 | -16) => void;
  setNormalizationPreventClipping: (preventClipping: boolean) => void;
  setAutoplayEnabled: (enabled: boolean) => void;
}

const DEFAULT_CROSSFADE: CrossfadeSettings = {
  enabled: false,
  duration: 5,
  smartMode: true,
  tempoMatch: false,
};

const DEFAULT_NORMALIZATION: NormalizationSettings = {
  enabled: true,
  targetLufs: -16,
  preventClipping: true,
};

const DEFAULT_AUTOPLAY: AutoplaySettings = {
  enabled: true,
};

const initialState = {
  playerPreference: 'dynamic' as PlayerPreference,
  crossfade: DEFAULT_CROSSFADE,
  normalization: DEFAULT_NORMALIZATION,
  autoplay: DEFAULT_AUTOPLAY,
};

export const usePlayerSettingsStore = create<PlayerSettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setPlayerPreference: (preference) => set({ playerPreference: preference }),

      setCrossfadeEnabled: (enabled) =>
        set((state) => ({
          crossfade: { ...state.crossfade, enabled },
        })),

      setCrossfadeDuration: (duration) =>
        set((state) => ({
          crossfade: {
            ...state.crossfade,
            duration: Math.max(1, Math.min(12, duration)),
          },
        })),

      setCrossfadeSmartMode: (smartMode) =>
        set((state) => ({
          crossfade: { ...state.crossfade, smartMode },
        })),

      setCrossfadeTempoMatch: (tempoMatch) =>
        set((state) => ({
          crossfade: { ...state.crossfade, tempoMatch },
        })),

      setNormalizationEnabled: (enabled) =>
        set((state) => ({
          normalization: { ...state.normalization, enabled },
        })),

      setNormalizationTargetLufs: (targetLufs) =>
        set((state) => ({
          normalization: { ...state.normalization, targetLufs },
        })),

      setNormalizationPreventClipping: (preventClipping) =>
        set((state) => ({
          normalization: { ...state.normalization, preventClipping },
        })),

      setAutoplayEnabled: (enabled) =>
        set((state) => ({
          autoplay: { ...state.autoplay, enabled },
        })),
    }),
    {
      name: 'echo-player-settings',
      version: STORE_VERSION,

      migrate: (persistedState, version) => {
        if (version === 0 || !persistedState) {
          return initialState;
        }
        // v1 → v2: agrega tempoMatch a crossfade
        if (version < 2) {
          const state = persistedState as Record<string, unknown>;
          const crossfade = state.crossfade as CrossfadeSettings | undefined;
          if (crossfade && crossfade.tempoMatch === undefined) {
            crossfade.tempoMatch = false;
          }
        }
        return persistedState as PlayerSettingsState;
      },

      // Migración desde claves antiguas de localStorage
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[PlayerSettingsStore] Error loading persisted state:', error);
          localStorage.removeItem('echo-player-settings');
          return;
        }

        if (!state) return;

        try {
          const oldPreference = localStorage.getItem('player-preference');
          if (oldPreference && state.playerPreference === 'dynamic') {
            const validPreferences: PlayerPreference[] = ['dynamic', 'sidebar', 'footer'];
            if (validPreferences.includes(oldPreference as PlayerPreference)) {
              state.setPlayerPreference(oldPreference as PlayerPreference);
            }
            localStorage.removeItem('player-preference');
          }

          const oldCrossfade = localStorage.getItem('crossfade-settings');
          if (oldCrossfade) {
            const parsed = JSON.parse(oldCrossfade);
            if (parsed.enabled !== undefined) state.setCrossfadeEnabled(parsed.enabled);
            if (parsed.duration !== undefined) state.setCrossfadeDuration(parsed.duration);
            localStorage.removeItem('crossfade-settings');
          }

          const oldNormalization = localStorage.getItem('normalization-settings');
          if (oldNormalization) {
            const parsed = JSON.parse(oldNormalization);
            if (parsed.enabled !== undefined) state.setNormalizationEnabled(parsed.enabled);
            if (parsed.targetLufs !== undefined)
              state.setNormalizationTargetLufs(parsed.targetLufs);
            if (parsed.preventClipping !== undefined)
              state.setNormalizationPreventClipping(parsed.preventClipping);
            localStorage.removeItem('normalization-settings');
          }

          const oldAutoplay = localStorage.getItem('autoplay-settings');
          if (oldAutoplay) {
            const parsed = JSON.parse(oldAutoplay);
            if (parsed.enabled !== undefined) state.setAutoplayEnabled(parsed.enabled);
            localStorage.removeItem('autoplay-settings');
          }
        } catch {
          // Migration errors are non-critical; old settings will be ignored
        }
      },

      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as Partial<PlayerSettingsState>) || {}),
      }),
    }
  )
);
