export interface Track {
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  duration: number;
  coverImage?: string;
  trackNumber?: number;
}

export interface RadioStation {
  id?: string;
  stationUuid?: string;
  name: string;
  url: string;
  favicon?: string | null;
  country?: string | null;
  tags?: string | null;
  codec?: string | null;
  bitrate?: number | null;
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

  // Radio playback
  currentRadioStation: RadioStation | null;
  isRadioMode: boolean;
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
  toggleRepeat: () => void;
}
