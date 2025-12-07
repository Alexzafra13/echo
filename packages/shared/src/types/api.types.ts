/**
 * Generic API response types
 * Standardizes paginated and search response structures across the application
 */

/**
 * Standard paginated response from the API
 * Used for endpoints that return lists with pagination support
 *
 * @template T - The type of items in the data array
 *
 * @example
 * // Usage in service
 * const { data } = await apiClient.get<PaginatedResponse<Album>>('/albums', { params });
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Total number of items across all pages */
  total: number;
  /** Number of items skipped (offset) */
  skip: number;
  /** Number of items per page (limit) */
  take: number;
  /** Whether there are more items to fetch */
  hasMore: boolean;
}

/**
 * Search response extends PaginatedResponse with query information
 * Used for search endpoints
 *
 * @template T - The type of items in the data array
 *
 * @example
 * // Usage in service
 * const { data } = await apiClient.get<SearchResponse<Track>>(`/tracks/search/${query}`);
 */
export interface SearchResponse<T> extends PaginatedResponse<T> {
  /** The search query that was executed */
  query: string;
}

/**
 * Standard pagination parameters for API requests
 */
export interface PaginationParams {
  /** Number of items to skip */
  skip?: number;
  /** Number of items to return */
  take?: number;
}

/**
 * Alternative pagination using page/limit pattern
 */
export interface PageBasedPaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
}

/**
 * Generic success response wrapper
 * Some endpoints return data wrapped in a success envelope
 */
export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
