import { Track } from '@features/tracks/domain/entities/track.entity';

export interface GetAlbumTracksInput {
  albumId: string;
  skip?: number;
  take?: number;
}

export interface GetAlbumTracksOutput {
  tracks: Track[];
  albumId: string;
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
