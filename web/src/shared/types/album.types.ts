/**
 * Shared Album Types
 * Core album entity used across the application
 */

/**
 * Album entity type
 * Represents a music album with all its metadata
 */
export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverImage: string;
  backgroundImage?: string;
  albumArt?: string;
  year: number;
  releaseDate?: string;
  totalTracks: number;
  duration?: number;
  genres?: string[];
  genre?: string; // Single genre (from API)
  addedAt?: Date;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  path?: string; // File system path
}

/**
 * Album sort/filter options
 */
export type AlbumSortOption = 'recent' | 'alphabetical' | 'artist' | 'recently-played' | 'top-played' | 'favorites';

/**
 * Paginated response type for albums
 */
export interface PaginatedAlbumsResponse {
  data: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
