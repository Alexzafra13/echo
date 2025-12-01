import { useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';
import type { NormalizationSettings } from '../types';

const STORAGE_KEY = 'normalization-settings';
const NORMALIZATION_CHANGE_EVENT = 'normalizationSettingsChange';

const DEFAULT_SETTINGS: NormalizationSettings = {
  enabled: true, // Enabled by default for better experience
  targetLufs: -16, // Apple Music style (more conservative)
  preventClipping: true, // Apple style: respect peaks
};

/**
 * Hook para gestionar la configuración de normalización de audio
 * - enabled: Si la normalización está activada
 * - targetLufs: Nivel de loudness objetivo (-14 Spotify, -16 Apple)
 * - preventClipping: Estilo Apple - no subir más allá del headroom disponible
 *
 * Persiste la configuración en localStorage y sincroniza entre componentes
 */
export function useNormalizationSettings() {
  const [settings, setSettingsState] = useState<NormalizationSettings>(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as NormalizationSettings;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Escuchar cambios de configuración desde otros componentes
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent<NormalizationSettings>) => {
      setSettingsState(event.detail);
    };

    window.addEventListener(NORMALIZATION_CHANGE_EVENT, handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener(NORMALIZATION_CHANGE_EVENT, handleSettingsChange as EventListener);
    };
  }, []);

  const setSettings = useCallback((newSettings: Partial<NormalizationSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Notificar a otros componentes del cambio
      const event = new CustomEvent(NORMALIZATION_CHANGE_EVENT, { detail: updated });
      window.dispatchEvent(event);

      return updated;
    });
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings({ enabled });
  }, [setSettings]);

  const setTargetLufs = useCallback((targetLufs: -14 | -16) => {
    setSettings({ targetLufs });
  }, [setSettings]);

  const setPreventClipping = useCallback((preventClipping: boolean) => {
    setSettings({ preventClipping });
  }, [setSettings]);

  return {
    settings,
    setSettings,
    setEnabled,
    setTargetLufs,
    setPreventClipping,
  };
}
