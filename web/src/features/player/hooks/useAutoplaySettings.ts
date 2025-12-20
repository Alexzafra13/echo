import { useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';

const STORAGE_KEY = 'autoplay-settings';
const AUTOPLAY_CHANGE_EVENT = 'autoplaySettingsChange';

export interface AutoplaySettings {
  enabled: boolean;
}

const DEFAULT_SETTINGS: AutoplaySettings = {
  enabled: true, // Activado por defecto, como Spotify
};

/**
 * Hook para gestionar la configuración del autoplay
 * Cuando termina un álbum/playlist, continúa automáticamente con artistas similares
 *
 * Persiste la configuración en localStorage y sincroniza entre componentes
 */
export function useAutoplaySettings() {
  const [settings, setSettingsState] = useState<AutoplaySettings>(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as AutoplaySettings;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Escuchar cambios de configuración desde otros componentes
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent<AutoplaySettings>) => {
      setSettingsState(event.detail);
    };

    window.addEventListener(AUTOPLAY_CHANGE_EVENT, handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener(AUTOPLAY_CHANGE_EVENT, handleSettingsChange as EventListener);
    };
  }, []);

  const setSettings = useCallback((newSettings: Partial<AutoplaySettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Notificar a otros componentes del cambio
      const event = new CustomEvent(AUTOPLAY_CHANGE_EVENT, { detail: updated });
      window.dispatchEvent(event);

      return updated;
    });
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings({ enabled });
  }, [setSettings]);

  return {
    settings,
    setSettings,
    setEnabled,
  };
}
