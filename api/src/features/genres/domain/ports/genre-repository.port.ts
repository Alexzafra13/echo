import { Genre } from '../entities/genre.entity';
import { Album } from '@features/albums/domain/entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { Artist } from '@features/artists/domain/entities/artist.entity';

export type GenreSortField = 'name' | 'trackCount' | 'albumCount';
export type AlbumInGenreSortField = 'releaseYear' | 'title' | 'playCount';
export type TrackInGenreSortField = 'playCount' | 'title' | 'releaseYear';
export type ArtistInGenreSortField = 'name' | 'albumCount' | 'songCount';
export type SortOrder = 'asc' | 'desc';

export interface ListGenresParams {
  skip: number;
  take: number;
  sort: GenreSortField;
  order: SortOrder;
  search?: string;
}

export interface GenreAlbumsQuery {
  genreId: string;
  skip: number;
  take: number;
  sort: AlbumInGenreSortField;
  order: SortOrder;
}

export interface GenreTracksQuery {
  genreId: string;
  skip: number;
  take: number;
  sort: TrackInGenreSortField;
  order: SortOrder;
}

export interface GenreArtistsQuery {
  genreId: string;
  skip: number;
  take: number;
  sort: ArtistInGenreSortField;
  order: SortOrder;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IGenreRepository {
  list(params: ListGenresParams): Promise<Genre[]>;
  count(search?: string): Promise<number>;
  findById(id: string): Promise<Genre | null>;
  findAlbumsByGenre(query: GenreAlbumsQuery): Promise<PaginatedResult<Album>>;
  findTracksByGenre(query: GenreTracksQuery): Promise<PaginatedResult<Track>>;
  findArtistsByGenre(query: GenreArtistsQuery): Promise<PaginatedResult<Artist>>;
}

export const GENRE_REPOSITORY = 'IGenreRepository';
