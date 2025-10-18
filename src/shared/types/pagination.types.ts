export interface PaginationQuery {
  skip?: number;
  take?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}