import type { Track, TrackAlbum } from '@shared/types/track.types';
import type { RadioStation, RadioMetadata } from '@shared/types/radio.types';

export type { Track, TrackAlbum };
export type { RadioStation, RadioMetadata };

export interface CrossfadeSettings {
  enabled: boolean;
  duration: number; // Duración en segundos (1-12)
  smartMode: boolean; // Usa outroStart del track para temporizar el crossfade
  tempoMatch: boolean; // Ajusta gradualmente el BPM de salida al de entrada
}

export interface NormalizationSettings {
  enabled: boolean;
  targetLufs: -14 | -16; // -14 = estilo Spotify, -16 = estilo Apple
  preventClipping: boolean; // No amplificar más allá del headroom de pico
}

export interface AutoplaySettings {
  enabled: boolean;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';

  crossfade: CrossfadeSettings;
  isCrossfading: boolean;

  normalization: NormalizationSettings;

  currentRadioStation: RadioStation | null;
  isRadioMode: boolean;
  radioMetadata: RadioMetadata | null;
  radioSignalStatus: 'good' | 'weak' | 'error' | null;

  // Autoplay: continúa con artistas similares al terminar la cola
  autoplay: AutoplaySettings;
  isAutoplayActive: boolean;
  autoplaySourceArtist: string | null;
}

export interface PlayerContextValue extends PlayerState {
  play: (track?: Track) => void;
  pause: () => void;
  togglePlayPause: () => void;
  stop: () => void;

  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track | Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;

  playRadio: (station: RadioStation) => void;
  stopRadio: () => void;

  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  setShuffle: (enabled: boolean) => void;
  toggleRepeat: () => void;

  setCrossfadeEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;
  setCrossfadeSmartMode: (enabled: boolean) => void;
  setCrossfadeTempoMatch: (enabled: boolean) => void;

  setNormalizationEnabled: (enabled: boolean) => void;
  setNormalizationTargetLufs: (target: -14 | -16) => void;
  setNormalizationPreventClipping: (prevent: boolean) => void;

  setAutoplayEnabled: (enabled: boolean) => void;
}
