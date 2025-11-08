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
  size: bigint;
  path: string;
  albumId?: string;
  artistId?: string;
  bitRate?: number;
  suffix?: string;
  artistName?: string;
  albumName?: string;
  playlistOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetPlaylistTracksOutput {
  playlistId: string;
  playlistName: string;
  tracks: TrackItem[];
  total: number;
}
