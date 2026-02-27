/**
 * Artist Types - Feature-specific types and re-exports
 *
 * Core Artist types are defined in @shared/types/artist.types
 * This file re-exports them and adds feature-specific types
 */

// Re-export core types from shared
export type { Artist, ArtistDetail, PaginatedArtists } from '@shared/types/artist.types';

// Import for local use
import type { Artist } from '@shared/types/artist.types';

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
 * Related artist data (from Last.fm, filtered to local library)
 */
export interface RelatedArtist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  matchScore: number; // 0-100% match score from Last.fm
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
  source: 'external' | 'genre' | 'internal' | 'none';
}
