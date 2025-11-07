export interface Track {
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  duration: number;
  coverImage?: string;
  trackNumber?: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
}

export interface PlayerContextValue extends PlayerState {
  // Playback control
  play: (track?: Track) => void;
  pause: () => void;
  togglePlayPause: () => void;
  stop: () => void;

  // Queue management
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: Track | Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;

  // Player controls
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}
