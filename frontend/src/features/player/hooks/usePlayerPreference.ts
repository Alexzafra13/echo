import { useState, useEffect } from 'react';

export type PlayerPreference = 'dynamic' | 'sidebar' | 'footer';

const STORAGE_KEY = 'player-preference';

/**
 * Hook para gestionar la preferencia de posición del reproductor
 * - dynamic: Comportamiento por defecto (footer → sidebar al scrollear)
 * - sidebar: Siempre en el sidebar (mini-player)
 * - footer: Siempre en el footer (player principal)
 */
export function usePlayerPreference() {
  const [preference, setPreferenceState] = useState<PlayerPreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as PlayerPreference) || 'dynamic';
  });

  const setPreference = (value: PlayerPreference) => {
    setPreferenceState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { preference, setPreference };
}
