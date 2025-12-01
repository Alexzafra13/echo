import { useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';
import type { CrossfadeSettings } from '../types';

const STORAGE_KEY = 'crossfade-settings';
const CROSSFADE_CHANGE_EVENT = 'crossfadeSettingsChange';

const DEFAULT_SETTINGS: CrossfadeSettings = {
  enabled: false,
  duration: 5, // 5 seconds default
};

/**
 * Hook para gestionar la configuración del crossfade entre canciones
 * - enabled: Si el crossfade está activado
 * - duration: Duración del crossfade en segundos (1-12)
 *
 * Persiste la configuración en localStorage y sincroniza entre componentes
 */
export function useCrossfadeSettings() {
  const [settings, setSettingsState] = useState<CrossfadeSettings>(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as CrossfadeSettings;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Escuchar cambios de configuración desde otros componentes
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent<CrossfadeSettings>) => {
      setSettingsState(event.detail);
    };

    window.addEventListener(CROSSFADE_CHANGE_EVENT, handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener(CROSSFADE_CHANGE_EVENT, handleSettingsChange as EventListener);
    };
  }, []);

  const setSettings = useCallback((newSettings: Partial<CrossfadeSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Notificar a otros componentes del cambio
      const event = new CustomEvent(CROSSFADE_CHANGE_EVENT, { detail: updated });
      window.dispatchEvent(event);

      return updated;
    });
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings({ enabled });
  }, [setSettings]);

  const setDuration = useCallback((duration: number) => {
    // Clamp duration between 1 and 12 seconds
    const clampedDuration = Math.max(1, Math.min(12, duration));
    setSettings({ duration: clampedDuration });
  }, [setSettings]);

  return {
    settings,
    setSettings,
    setEnabled,
    setDuration,
  };
}
