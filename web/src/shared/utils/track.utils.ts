/**
 * Track Conversion Utilities
 *
 * Centralized functions for converting various track formats to the Player Track type.
 * This avoids code duplication across components that need to prepare tracks for playback.
 */

import type { Track } from '@shared/types/track.types';

/**
 * Source track interface - represents the minimum fields we can convert from
 * Most API responses and component track types extend this pattern
 */
export interface TrackSource {
  id: string;
  title: string;
  artistName?: string | null;
  artist?: string;
  artistId?: string | null;
  albumId?: string | null;
  albumName?: string | null;
  albumTitle?: string; // Some APIs use albumTitle instead of albumName
  duration?: number | null;
  coverImage?: string;
  trackNumber?: number;
  discNumber?: number;
  path?: string;
  // Audio normalization (LUFS)
  rgTrackGain?: number | null;
  rgTrackPeak?: number | null;
  rgAlbumGain?: number | null;
  rgAlbumPeak?: number | null;
  // Smart crossfade
  outroStart?: number | null;
  // BPM
  bpm?: number | null;
}

/**
 * Optional context to provide album-level defaults when converting tracks
 */
export interface AlbumContext {
  albumId?: string;
  albumName?: string;
  artist?: string;
  artistId?: string;
  coverImage?: string;
}

/**
 * Convert a single track to the Player Track format
 *
 * @param source - Source track with various possible field names
 * @param context - Optional album context for default values
 * @returns Track formatted for the player
 *
 * @example
 * ```tsx
 * // Simple conversion
 * const playerTrack = toPlayerTrack(apiTrack);
 *
 * // With album context
 * const playerTrack = toPlayerTrack(apiTrack, {
 *   albumId: album.id,
 *   albumName: album.title,
 *   artist: album.artist
 * });
 * ```
 */
export function toPlayerTrack(source: TrackSource, context?: AlbumContext): Track {
  const albumId = source.albumId || context?.albumId;

  return {
    id: source.id,
    title: source.title,
    artist: source.artistName || source.artist || context?.artist || 'Unknown Artist',
    artistId: source.artistId || context?.artistId,
    albumId: albumId || undefined,
    albumName: source.albumName || source.albumTitle || context?.albumName,
    duration: source.duration || 0,
    coverImage: source.coverImage || context?.coverImage || (albumId ? `/api/images/albums/${albumId}/cover` : undefined),
    trackNumber: source.trackNumber,
    discNumber: source.discNumber,
    path: source.path,
    // Audio normalization data (LUFS)
    rgTrackGain: source.rgTrackGain ?? undefined,
    rgTrackPeak: source.rgTrackPeak ?? undefined,
    rgAlbumGain: source.rgAlbumGain ?? undefined,
    rgAlbumPeak: source.rgAlbumPeak ?? undefined,
    // Smart crossfade
    outroStart: source.outroStart ?? undefined,
    // BPM (for tempo-matched crossfade)
    bpm: source.bpm ?? undefined,
  };
}

/**
 * Convert an array of tracks to Player Track format
 *
 * @param sources - Array of source tracks
 * @param context - Optional album context for default values
 * @returns Array of tracks formatted for the player
 *
 * @example
 * ```tsx
 * // Convert search results
 * const playerTracks = toPlayerTracks(searchResults);
 *
 * // Convert album tracks with album context
 * const playerTracks = toPlayerTracks(albumTracks, {
 *   albumId: id,
 *   albumName: album.title,
 *   artist: album.artist
 * });
 * ```
 */
export function toPlayerTracks(sources: TrackSource[], context?: AlbumContext): Track[] {
  return sources.map(source => toPlayerTrack(source, context));
}
