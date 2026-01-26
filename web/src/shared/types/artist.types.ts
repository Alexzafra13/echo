/**
 * Shared Artist Types
 * Core artist entity used across the application
 */

/**
 * Artist entity (list view)
 *
 * Note: Images are fetched dynamically via ImageService API endpoints
 * using getArtistImageUrl(artistId, imageType, tag). URLs are not stored in database.
 */
export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  orderArtistName?: string;
  updatedAt?: string; // Used for cache-busting image URLs
}

/**
 * Artist detail (detail view with full info)
 */
export interface ArtistDetail extends Artist {
  biography?: string;
  biographySource?: string;
  mbzArtistId?: string;
  externalUrl?: string;
  externalInfoUpdatedAt?: string;
  backgroundPosition?: string; // CSS background-position for background image
  size: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated artists response
 */
export interface PaginatedArtists {
  data: Artist[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
