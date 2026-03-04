export interface GetPlaylistDjShuffledTracksInput {
  playlistId: string;
  requesterId: string;
  /** Seed for deterministic shuffling (0-1). If not provided, a new one is generated */
  seed?: number;
}

export interface GetPlaylistDjShuffledTracksOutput {
  playlistId: string;
  playlistName: string;
  tracks: PlaylistDjShuffledTrackItem[];
  total: number;
  seed: number;
  /** Whether DJ-aware ordering was used (true) or fallback to random (false) */
  djMode: boolean;
}

export interface PlaylistDjShuffledTrackItem {
  id: string;
  title: string;
  trackNumber?: number;
  discNumber: number;
  year?: number;
  duration: number;
  size: number;
  path: string;
  albumId?: string;
  artistId?: string;
  bitRate?: number;
  suffix?: string;
  artistName?: string;
  albumName?: string;
  // Audio normalization data (LUFS/ReplayGain)
  rgTrackGain?: number;
  rgTrackPeak?: number;
  rgAlbumGain?: number;
  rgAlbumPeak?: number;
  // Smart crossfade & DJ
  outroStart?: number;
  bpm?: number;
  createdAt: Date;
  updatedAt: Date;
}
