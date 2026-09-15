import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_VOLUME } from '../types';
import type {
  CrossfadeSettings,
  AutoplaySettings,
  NormalizationSettings,
  DjModeSettings,
} from '../types';

// Incrementar al cambiar la estructura del estado persistido
const STORE_VERSION = 1;

export type PlayerPreference = 'dynamic' | 'sidebar' | 'footer';

interface PlayerSettingsState {
  playerPreference: PlayerPreference;
  crossfade: CrossfadeSettings;
  autoplay: AutoplaySettings;
  normalization: NormalizationSettings;
  djMode: DjModeSettings;
  /** Volumen del usuario (0-1), se conserva entre sesiones */
  volume: number;

  setPlayerPreference: (preference: PlayerPreference) => void;
  setCrossfadeEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;
  setCrossfadeSmartMode: (enabled: boolean) => void;
  setCrossfadeTempoMatch: (tempoMatch: boolean) => void;
  setAutoplayEnabled: (enabled: boolean) => void;
  setNormalizationEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setDjModeEnabled: (enabled: boolean) => void;
  /** null borra la excepción y la playlist vuelve al valor global */
  setPlaylistDjMode: (playlistId: string, enabled: boolean | null) => void;
}

/** Modo DJ efectivo para una playlist: su excepción si existe, si no el global */
export function resolveDjMode(djMode: DjModeSettings, playlistId?: string): boolean {
  if (playlistId && playlistId in djMode.playlistOverrides) {
    return djMode.playlistOverrides[playlistId];
  }
  return djMode.enabled;
}

const DEFAULT_CROSSFADE: CrossfadeSettings = {
  enabled: true,
  duration: 2,
  smartMode: false,
  tempoMatch: false,
};

const DEFAULT_AUTOPLAY: AutoplaySettings = {
  enabled: true,
};

const DEFAULT_NORMALIZATION: NormalizationSettings = {
  enabled: true,
};

const DEFAULT_DJ_MODE: DjModeSettings = {
  enabled: true,
  playlistOverrides: {},
};

const initialState = {
  playerPreference: 'dynamic' as PlayerPreference,
  crossfade: DEFAULT_CROSSFADE,
  autoplay: DEFAULT_AUTOPLAY,
  normalization: DEFAULT_NORMALIZATION,
  djMode: DEFAULT_DJ_MODE,
  volume: DEFAULT_VOLUME,
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

      setAutoplayEnabled: (enabled) =>
        set((state) => ({
          autoplay: { ...state.autoplay, enabled },
        })),

      setNormalizationEnabled: (enabled) =>
        set((state) => ({
          normalization: { ...state.normalization, enabled },
        })),

      setVolume: (volume) =>
        set({
          volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_VOLUME,
        }),

      setDjModeEnabled: (enabled) =>
        set((state) => ({
          djMode: { ...state.djMode, enabled },
        })),

      setPlaylistDjMode: (playlistId, enabled) =>
        set((state) => {
          const playlistOverrides = { ...state.djMode.playlistOverrides };
          if (enabled === null) {
            delete playlistOverrides[playlistId];
          } else {
            playlistOverrides[playlistId] = enabled;
          }
          return { djMode: { ...state.djMode, playlistOverrides } };
        }),
    }),
    {
      name: 'echo-player-settings',
      version: STORE_VERSION,

      migrate: (_persistedState, version) => {
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
