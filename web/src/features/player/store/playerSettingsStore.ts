import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CrossfadeSettings, NormalizationSettings, AutoplaySettings } from '../types';

// Incrementar al cambiar la estructura del estado persistido
const STORE_VERSION = 1;

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
  enabled: false,
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

      migrate: (_persistedState, version) => {
        // Sin usuarios existentes: si la versión no coincide, usar defaults
        if (version !== STORE_VERSION || !_persistedState) {
          return initialState;
        }
        return _persistedState as PlayerSettingsState;
      },

      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as Partial<PlayerSettingsState>) || {}),
      }),
    }
  )
);
