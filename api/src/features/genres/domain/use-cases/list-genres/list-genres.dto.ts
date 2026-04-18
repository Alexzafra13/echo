import { Genre } from '../../entities/genre.entity';
import { GenreSortField, SortOrder } from '../../ports/genre-repository.port';

export interface ListGenresInput {
  skip: number;
  take: number;
  sort: GenreSortField;
  order: SortOrder;
  search?: string;
}

export interface ListGenresOutput {
  data: Genre[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
