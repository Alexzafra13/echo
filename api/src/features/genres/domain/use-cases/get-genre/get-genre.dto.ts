import { Genre } from '../../entities/genre.entity';

export interface GetGenreInput {
  id: string;
}

export type GetGenreOutput = Genre;
