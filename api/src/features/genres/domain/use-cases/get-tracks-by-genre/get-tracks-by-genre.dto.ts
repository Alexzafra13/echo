import { Track } from '@features/tracks/domain/entities/track.entity';
import { TrackInGenreSortField, SortOrder } from '../../ports/genre-repository.port';

export interface GetTracksByGenreInput {
  genreId: string;
  skip: number;
  take: number;
  sort: TrackInGenreSortField;
  order: SortOrder;
}

export interface GetTracksByGenreOutput {
  data: Track[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
