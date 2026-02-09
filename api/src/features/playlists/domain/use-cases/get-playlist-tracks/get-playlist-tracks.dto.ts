export interface GetPlaylistTracksInput {
  playlistId: string;
}

export interface TrackItem {
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
  playlistOrder?: number;
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

export interface GetPlaylistTracksOutput {
  playlistId: string;
  playlistName: string;
  tracks: TrackItem[];
  total: number;
}
