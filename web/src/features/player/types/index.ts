// Import shared types for use in this file
import type { Track, TrackAlbum } from '@shared/types/track.types';
import type { RadioStation, RadioMetadata } from '@shared/types/radio.types';

// Re-export shared types for player usage
export type { Track, TrackAlbum };
export type { RadioStation, RadioMetadata };

export interface CrossfadeSettings {
  enabled: boolean;
  duration: number; // Duration in seconds (1-12)
}

export interface NormalizationSettings {
  enabled: boolean;
  targetLufs: -14 | -16; // -14 = Spotify style, -16 = Apple style
  preventClipping: boolean; // Apple style: don't boost beyond peak headroom
}

export interface PlayerState {
  // Track playback
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';

  // Crossfade
  crossfade: CrossfadeSettings;
  isCrossfading: boolean;

  // Audio normalization
  normalization: NormalizationSettings;

  // Radio playback
  currentRadioStation: RadioStation | null;
  isRadioMode: boolean;
  radioMetadata: RadioMetadata | null;
  radioSignalStatus: 'good' | 'weak' | 'error' | null; // Radio signal quality
}

export interface PlayerContextValue extends PlayerState {
  // Track playback control
  play: (track?: Track) => void;
  pause: () => void;
  togglePlayPause: () => void;
  stop: () => void;

  // Track queue management
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track | Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;

  // Radio control
  playRadio: (station: RadioStation) => void;
  stopRadio: () => void;

  // Player controls
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  setShuffle: (enabled: boolean) => void;
  toggleRepeat: () => void;

  // Crossfade controls
  setCrossfadeEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;

  // Normalization controls
  setNormalizationEnabled: (enabled: boolean) => void;
  setNormalizationTargetLufs: (target: -14 | -16) => void;
  setNormalizationPreventClipping: (prevent: boolean) => void;
}
