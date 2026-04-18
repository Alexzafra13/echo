import { Artist } from '@features/artists/domain/entities/artist.entity';
import { ArtistInGenreSortField, SortOrder } from '../../ports/genre-repository.port';

export interface GetArtistsByGenreInput {
  genreId: string;
  skip: number;
  take: number;
  sort: ArtistInGenreSortField;
  order: SortOrder;
}

export interface GetArtistsByGenreOutput {
  data: Artist[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
