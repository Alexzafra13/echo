import { Track } from '@features/tracks/domain/entities/track.entity';

export interface GetAlbumTracksInput {
  albumId: string;
}

export interface GetAlbumTracksOutput {
  tracks: Track[];
  albumId: string;
  totalTracks: number;
}
