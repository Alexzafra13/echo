/**
 * Artist entity (list view)
 */
export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  orderArtistName?: string;
}

/**
 * Artist detail (detail view with full info)
 */
export interface ArtistDetail extends Artist {
  biography?: string;
  mbzArtistId?: string;
  externalUrl?: string;
  externalInfoUpdatedAt?: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated artists response
 */
export interface PaginatedArtists {
  artists: Artist[];
  total: number;
  skip: number;
  take: number;
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
