import { useState, useEffect } from 'react';
import { safeLocalStorage } from '@shared/utils/safeLocalStorage';

export type PlayerPreference = 'dynamic' | 'sidebar' | 'footer';

const STORAGE_KEY = 'player-preference';
const PREFERENCE_CHANGE_EVENT = 'playerPreferenceChange';

/**
 * Hook para gestionar la preferencia de posición del reproductor
 * - dynamic: Comportamiento por defecto (footer → sidebar al scrollear)
 * - sidebar: Siempre en el sidebar (mini-player)
 * - footer: Siempre en el footer (player principal)
 *
 * Sincroniza la preferencia entre todos los componentes usando CustomEvent
 */
export function usePlayerPreference() {
  const [preference, setPreferenceState] = useState<PlayerPreference>(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    return (stored as PlayerPreference) || 'dynamic';
  });

  // Escuchar cambios de preferencia desde otros componentes
  useEffect(() => {
    const handlePreferenceChange = (event: CustomEvent<PlayerPreference>) => {
      setPreferenceState(event.detail);
    };

    window.addEventListener(PREFERENCE_CHANGE_EVENT, handlePreferenceChange as EventListener);
    return () => {
      window.removeEventListener(PREFERENCE_CHANGE_EVENT, handlePreferenceChange as EventListener);
    };
  }, []);

  const setPreference = (value: PlayerPreference) => {
    setPreferenceState(value);
    safeLocalStorage.setItem(STORAGE_KEY, value);

    // Notificar a otros componentes del cambio
    const event = new CustomEvent(PREFERENCE_CHANGE_EVENT, { detail: value });
    window.dispatchEvent(event);
  };

  return { preference, setPreference };
}
