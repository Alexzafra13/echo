import { Album } from '@features/albums/domain/entities/album.entity';
import { AlbumInGenreSortField, SortOrder } from '../../ports/genre-repository.port';

export interface GetAlbumsByGenreInput {
  genreId: string;
  skip: number;
  take: number;
  sort: AlbumInGenreSortField;
  order: SortOrder;
}

export interface GetAlbumsByGenreOutput {
  data: Album[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
