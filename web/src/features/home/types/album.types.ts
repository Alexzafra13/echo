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
  addedAt: Date;
  createdAt?: string; // ISO date string
  path?: string; // File system path
}

/**
 * Props for AlbumCard component
 */
export interface AlbumCardProps {
  cover: string;
  title: string;
  artist: string;
  onClick?: () => void;
  onPlayClick?: () => void;
}

/**
 * Props for AlbumGrid component
 */
export interface AlbumGridProps {
  title: string;
  albums: Album[];
}

/**
 * Hero item - can be an Album or an Artist Playlist
 */
export type HeroItem =
  | { type: 'album'; data: Album }
  | { type: 'playlist'; data: import('@shared/services/recommendations.service').AutoPlaylist };

/**
 * Type guard to check if HeroItem is an album
 */
export function isHeroAlbum(item: HeroItem): item is { type: 'album'; data: Album } {
  return item.type === 'album';
}

/**
 * Type guard to check if HeroItem is a playlist
 */
export function isHeroPlaylist(item: HeroItem): item is { type: 'playlist'; data: import('@shared/services/recommendations.service').AutoPlaylist } {
  return item.type === 'playlist';
}

/**
 * Props for HeroSection component
 */
export interface HeroSectionProps {
  item: HeroItem;
  onPlay?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

/**
 * Hero album data with playback state
 */
export interface HeroAlbumData {
  album: Album;
  isPlaying?: boolean;
}

/**
 * Album sort/filter options
 */
export type AlbumSortOption = 'recent' | 'alphabetical' | 'artist' | 'recently-played' | 'top-played' | 'favorites';

/**
 * Response type for alphabetically sorted albums
 * Standardized format: data + page/limit/total/totalPages/hasMore
 */
export interface AlbumsAlphabeticalResponse {
  data: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Response type for albums sorted by artist
 * Standardized format: data + page/limit/total/totalPages/hasMore
 */
export interface AlbumsByArtistResponse {
  data: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Response type for recently played albums
 * Standardized format: data (no pagination)
 */
export interface AlbumsRecentlyPlayedResponse {
  data: Album[];
}

/**
 * Response type for favorite albums
 * Standardized format: data + page/limit/hasMore
 */
export interface AlbumsFavoritesResponse {
  data: Album[];
  page: number;
  limit: number;
  hasMore: boolean;
}
