export interface GetTrackInput {
  id: string;
}

export interface GetTrackOutput {
  id: string;
  title: string;
  albumId?: string;
  artistId?: string;
  albumArtistId?: string;
  trackNumber?: number;
  discNumber: number;
  year?: number;
  duration?: number;
  path: string;
  bitRate?: number;
  size?: number;
  suffix?: string;
  lyrics?: string;
  comment?: string;
  albumName?: string;
  artistName?: string;
  albumArtistName?: string;
  compilation: boolean;
  createdAt: Date;
  updatedAt: Date;
}
