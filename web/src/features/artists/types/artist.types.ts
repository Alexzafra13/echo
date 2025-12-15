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

/**
 * Props for ArtistCard component
 */
export interface ArtistCardProps {
  artist: Artist;
  onClick?: () => void;
}

/**
 * Props for ArtistGrid component
 */
export interface ArtistGridProps {
  artists: Artist[];
  isLoading?: boolean;
}

/**
 * Top track data for an artist (with full track details)
 */
export interface ArtistTopTrack {
  trackId: string;
  title: string;
  albumId: string | null;
  albumName: string | null;
  duration: number | null;
  playCount: number;
  uniqueListeners: number;
}

/**
 * Artist global statistics
 */
export interface ArtistStats {
  artistId: string;
  totalPlays: number;
  uniqueListeners: number;
  avgCompletionRate: number;
  skipRate: number;
}

/**
 * Related artist data
 */
export interface RelatedArtist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  commonListeners: number;
  score: number;
}

/**
 * Response for artist top tracks
 */
export interface ArtistTopTracksResponse {
  data: ArtistTopTrack[];
  artistId: string;
  limit: number;
  days?: number;
}

/**
 * Response for related artists
 */
export interface RelatedArtistsResponse {
  data: RelatedArtist[];
  artistId: string;
  limit: number;
}
