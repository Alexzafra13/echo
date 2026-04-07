import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerSettingsStore } from './playerSettingsStore';

describe('playerSettingsStore', () => {
  beforeEach(() => {
    const store = usePlayerSettingsStore.getState();
    store.setPlayerPreference('dynamic');
    store.setCrossfadeEnabled(false);
    store.setCrossfadeDuration(2);
    store.setCrossfadeSmartMode(false);
    store.setAutoplayEnabled(true);
  });

  describe('initial state', () => {
    it('should have correct default player preference', () => {
      const state = usePlayerSettingsStore.getState();
      expect(state.playerPreference).toBe('dynamic');
    });

    it('should have correct default crossfade settings', () => {
      const state = usePlayerSettingsStore.getState();
      expect(state.crossfade).toEqual({
        enabled: false,
        duration: 2,
        smartMode: false,
        tempoMatch: false,
      });
    });

    it('should have correct default autoplay settings', () => {
      const state = usePlayerSettingsStore.getState();
      expect(state.autoplay).toEqual({
        enabled: true,
      });
    });
  });

  describe('player preference actions', () => {
    it('should set player preference to sidebar', () => {
      usePlayerSettingsStore.getState().setPlayerPreference('sidebar');
      expect(usePlayerSettingsStore.getState().playerPreference).toBe('sidebar');
    });

    it('should set player preference to footer', () => {
      usePlayerSettingsStore.getState().setPlayerPreference('footer');
      expect(usePlayerSettingsStore.getState().playerPreference).toBe('footer');
    });

    it('should set player preference back to dynamic', () => {
      usePlayerSettingsStore.getState().setPlayerPreference('footer');
      usePlayerSettingsStore.getState().setPlayerPreference('dynamic');
      expect(usePlayerSettingsStore.getState().playerPreference).toBe('dynamic');
    });
  });

  describe('crossfade actions', () => {
    it('should enable crossfade', () => {
      usePlayerSettingsStore.getState().setCrossfadeEnabled(true);
      expect(usePlayerSettingsStore.getState().crossfade.enabled).toBe(true);
    });

    it('should disable crossfade', () => {
      usePlayerSettingsStore.getState().setCrossfadeEnabled(true);
      usePlayerSettingsStore.getState().setCrossfadeEnabled(false);
      expect(usePlayerSettingsStore.getState().crossfade.enabled).toBe(false);
    });

    it('should set crossfade duration', () => {
      usePlayerSettingsStore.getState().setCrossfadeDuration(8);
      expect(usePlayerSettingsStore.getState().crossfade.duration).toBe(8);
    });

    it('should clamp crossfade duration to minimum of 1', () => {
      usePlayerSettingsStore.getState().setCrossfadeDuration(0);
      expect(usePlayerSettingsStore.getState().crossfade.duration).toBe(1);
    });

    it('should clamp crossfade duration to maximum of 12', () => {
      usePlayerSettingsStore.getState().setCrossfadeDuration(20);
      expect(usePlayerSettingsStore.getState().crossfade.duration).toBe(12);
    });

    it('should clamp negative crossfade duration to 1', () => {
      usePlayerSettingsStore.getState().setCrossfadeDuration(-5);
      expect(usePlayerSettingsStore.getState().crossfade.duration).toBe(1);
    });

    it('should enable smart mode', () => {
      usePlayerSettingsStore.getState().setCrossfadeSmartMode(false);
      usePlayerSettingsStore.getState().setCrossfadeSmartMode(true);
      expect(usePlayerSettingsStore.getState().crossfade.smartMode).toBe(true);
    });

    it('should disable smart mode', () => {
      usePlayerSettingsStore.getState().setCrossfadeSmartMode(false);
      expect(usePlayerSettingsStore.getState().crossfade.smartMode).toBe(false);
    });

    it('should not affect other crossfade settings when changing one', () => {
      usePlayerSettingsStore.getState().setCrossfadeEnabled(true);
      usePlayerSettingsStore.getState().setCrossfadeDuration(10);

      usePlayerSettingsStore.getState().setCrossfadeSmartMode(false);

      const state = usePlayerSettingsStore.getState();
      expect(state.crossfade.enabled).toBe(true);
      expect(state.crossfade.duration).toBe(10);
      expect(state.crossfade.smartMode).toBe(false);
    });
  });

  describe('autoplay actions', () => {
    it('should enable autoplay', () => {
      usePlayerSettingsStore.getState().setAutoplayEnabled(false);
      usePlayerSettingsStore.getState().setAutoplayEnabled(true);
      expect(usePlayerSettingsStore.getState().autoplay.enabled).toBe(true);
    });

    it('should disable autoplay', () => {
      usePlayerSettingsStore.getState().setAutoplayEnabled(false);
      expect(usePlayerSettingsStore.getState().autoplay.enabled).toBe(false);
    });
  });

  describe('settings isolation', () => {
    it('should not affect other settings groups when changing crossfade', () => {
      usePlayerSettingsStore.getState().setCrossfadeEnabled(true);
      usePlayerSettingsStore.getState().setCrossfadeDuration(10);

      const state = usePlayerSettingsStore.getState();
      expect(state.playerPreference).toBe('dynamic');
      expect(state.autoplay.enabled).toBe(true);
    });

    it('should not affect other settings groups when changing player preference', () => {
      usePlayerSettingsStore.getState().setPlayerPreference('footer');

      const state = usePlayerSettingsStore.getState();
      expect(state.crossfade.enabled).toBe(false);
      expect(state.autoplay.enabled).toBe(true);
    });
  });
});
