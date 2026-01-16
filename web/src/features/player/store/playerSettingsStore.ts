/**
 * Player Settings Store
 *
 * Consolidated Zustand store for all player settings:
 * - Player position preference (dynamic, sidebar, footer)
 * - Crossfade settings (enabled, duration)
 * - Normalization settings (enabled, targetLufs, preventClipping)
 * - Autoplay settings (enabled)
 *
 * Replaces the individual hooks that used CustomEvent pattern:
 * - usePlayerPreference
 * - useCrossfadeSettings
 * - useNormalizationSettings
 * - useAutoplaySettings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CrossfadeSettings, NormalizationSettings, AutoplaySettings } from '../types';

// Player position preference type
export type PlayerPreference = 'dynamic' | 'sidebar' | 'footer';

interface PlayerSettingsState {
  // Player position preference
  playerPreference: PlayerPreference;

  // Crossfade settings
  crossfade: CrossfadeSettings;

  // Normalization settings
  normalization: NormalizationSettings;

  // Autoplay settings
  autoplay: AutoplaySettings;

  // Player preference actions
  setPlayerPreference: (preference: PlayerPreference) => void;

  // Crossfade actions
  setCrossfadeEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;
  setCrossfadeSmartMode: (enabled: boolean) => void;

  // Normalization actions
  setNormalizationEnabled: (enabled: boolean) => void;
  setNormalizationTargetLufs: (targetLufs: -14 | -16) => void;
  setNormalizationPreventClipping: (preventClipping: boolean) => void;

  // Autoplay actions
  setAutoplayEnabled: (enabled: boolean) => void;
}

// Default values
const DEFAULT_CROSSFADE: CrossfadeSettings = {
  enabled: false,
  duration: 5,
  smartMode: true, // Use track's outroStart when available for intelligent timing
};

const DEFAULT_NORMALIZATION: NormalizationSettings = {
  enabled: true,
  targetLufs: -16,
  preventClipping: true,
};

const DEFAULT_AUTOPLAY: AutoplaySettings = {
  enabled: true,
};

export const usePlayerSettingsStore = create<PlayerSettingsState>()(
  persist(
    (set) => ({
      // Initial state
      playerPreference: 'dynamic',
      crossfade: DEFAULT_CROSSFADE,
      normalization: DEFAULT_NORMALIZATION,
      autoplay: DEFAULT_AUTOPLAY,

      // Player preference actions
      setPlayerPreference: (preference) =>
        set({ playerPreference: preference }),

      // Crossfade actions
      setCrossfadeEnabled: (enabled) =>
        set((state) => ({
          crossfade: { ...state.crossfade, enabled },
        })),

      setCrossfadeDuration: (duration) =>
        set((state) => ({
          crossfade: {
            ...state.crossfade,
            // Clamp duration between 1 and 12 seconds
            duration: Math.max(1, Math.min(12, duration)),
          },
        })),

      setCrossfadeSmartMode: (smartMode) =>
        set((state) => ({
          crossfade: { ...state.crossfade, smartMode },
        })),

      // Normalization actions
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

      // Autoplay actions
      setAutoplayEnabled: (enabled) =>
        set((state) => ({
          autoplay: { ...state.autoplay, enabled },
        })),
    }),
    {
      name: 'echo-player-settings',
      // Migrate from old localStorage keys
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Try to migrate from old storage keys if they exist
        try {
          // Migrate player preference
          const oldPreference = localStorage.getItem('player-preference');
          if (oldPreference && state.playerPreference === 'dynamic') {
            const validPreferences: PlayerPreference[] = ['dynamic', 'sidebar', 'footer'];
            if (validPreferences.includes(oldPreference as PlayerPreference)) {
              state.setPlayerPreference(oldPreference as PlayerPreference);
            }
            localStorage.removeItem('player-preference');
          }

          // Migrate crossfade settings
          const oldCrossfade = localStorage.getItem('crossfade-settings');
          if (oldCrossfade) {
            const parsed = JSON.parse(oldCrossfade);
            if (parsed.enabled !== undefined) state.setCrossfadeEnabled(parsed.enabled);
            if (parsed.duration !== undefined) state.setCrossfadeDuration(parsed.duration);
            localStorage.removeItem('crossfade-settings');
          }

          // Migrate normalization settings
          const oldNormalization = localStorage.getItem('normalization-settings');
          if (oldNormalization) {
            const parsed = JSON.parse(oldNormalization);
            if (parsed.enabled !== undefined) state.setNormalizationEnabled(parsed.enabled);
            if (parsed.targetLufs !== undefined) state.setNormalizationTargetLufs(parsed.targetLufs);
            if (parsed.preventClipping !== undefined) state.setNormalizationPreventClipping(parsed.preventClipping);
            localStorage.removeItem('normalization-settings');
          }

          // Migrate autoplay settings
          const oldAutoplay = localStorage.getItem('autoplay-settings');
          if (oldAutoplay) {
            const parsed = JSON.parse(oldAutoplay);
            if (parsed.enabled !== undefined) state.setAutoplayEnabled(parsed.enabled);
            localStorage.removeItem('autoplay-settings');
          }
        } catch {
          // Ignore migration errors
        }
      },
    }
  )
);
