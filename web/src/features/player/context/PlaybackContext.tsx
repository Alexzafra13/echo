/**
 * PlaybackContext — Estado de reproducción core.
 *
 * Contiene el estado de alta frecuencia (currentTime se actualiza ~60fps),
 * controles de reproducción y configuración de crossfade.
 */

import { createContext, useContext } from 'react';
import type { Track, CrossfadeSettings } from '../types';

export interface PlaybackContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;

  crossfade: CrossfadeSettings;
  isCrossfading: boolean;
  volumeControlSupported: boolean;

  play: (track?: Track) => void;
  pause: () => void;
  togglePlayPause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setCrossfadeEnabled: (enabled: boolean) => void;
}

export const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlayerProvider');
  }
  return context;
}
