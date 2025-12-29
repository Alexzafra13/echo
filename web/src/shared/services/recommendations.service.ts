/**
 * Recommendations Service
 *
 * Handles communication with the recommendations API endpoints.
 * Provides access to Daily Mix, smart playlists, and track scoring.
 *
 * @module recommendations.service
 */

import { apiClient } from './api';

/**
 * Score breakdown
 */
export interface ScoreBreakdown {
  explicitFeedback: number;
  implicitBehavior: number;
  recency: number;
  diversity: number;
}

/**
 * Track with score details
 */
export interface ScoredTrack {
  trackId: string;
  totalScore: number;
  rank: number;
  breakdown: ScoreBreakdown;
  track?: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
    albumId?: string;
    artistId?: string;
    // Audio normalization data (ReplayGain/LUFS)
    rgTrackGain?: number;
    rgTrackPeak?: number;
  };
  album?: {
    id: string;
    title?: string;
    artist?: string;
    cover?: string;
  };
}

/**
 * Daily Mix metadata
 */
export interface DailyMixMetadata {
  totalTracks: number;
  avgScore: number;
  topGenres: string[];
  topArtists: string[];
  artistId?: string; // For artist playlists
  artistName?: string; // For artist playlists
  temporalDistribution: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

/**
 * Auto Playlist response
 */
export interface AutoPlaylist {
  id: string;
  type: 'wave-mix' | 'artist' | 'genre' | 'mood';
  userId: string;
  name: string;
  description: string;
  tracks: ScoredTrack[];
  createdAt: string;
  expiresAt: string;
  metadata: DailyMixMetadata;
  coverColor?: string;
  coverImageUrl?: string;
}

// Legacy alias
export type DailyMix = AutoPlaylist;

/**
 * Smart playlist response
 */
export interface SmartPlaylist {
  name: string;
  tracks: ScoredTrack[];
  generatedAt: string;
  totalTracks: number;
  criteria: {
    artistId?: string;
    genre?: string;
    limit: number;
  };
}

/**
 * Calculate score request
 */
export interface CalculateScoreRequest {
  trackIds: string[];
}

/**
 * Get all Wave Mix playlists (daily mix + artist playlists + genre playlists)
 */
export async function getAutoPlaylists(): Promise<AutoPlaylist[]> {
  const response = await apiClient.get('/recommendations/wave-mix');
  return response.data;
}

/**
 * Force refresh Wave Mix playlists (regenerates all playlists)
 */
export async function refreshWaveMix(): Promise<AutoPlaylist[]> {
  const response = await apiClient.post('/recommendations/wave-mix/refresh');
  return response.data;
}

/**
 * Get paginated Wave Mix artist playlists
 * For the dedicated artist playlists page
 */
export async function getArtistPlaylistsPaginated(
  skip: number = 0,
  take: number = 10
): Promise<{
  playlists: AutoPlaylist[];
  total: number;
  hasMore: boolean;
}> {
  const response = await apiClient.get('/recommendations/wave-mix/artists', {
    params: { skip, take },
  });
  return response.data;
}

/**
 * Get paginated Wave Mix genre playlists
 * For the dedicated genre playlists page
 */
export async function getGenrePlaylistsPaginated(
  skip: number = 0,
  take: number = 10
): Promise<{
  playlists: AutoPlaylist[];
  total: number;
  hasMore: boolean;
}> {
  const response = await apiClient.get('/recommendations/wave-mix/genres', {
    params: { skip, take },
  });
  return response.data;
}

/**
 * Get Daily Mix (legacy - use getAutoPlaylists for new code)
 * Fetches a personalized mix of 50 tracks based on user preferences
 */
export async function getDailyMix(): Promise<DailyMix> {
  const response = await apiClient.get('/recommendations/daily-mix');
  return response.data;
}

/**
 * Generate smart playlist by artist
 */
export async function getSmartPlaylistByArtist(
  artistId: string,
  limit: number = 20
): Promise<SmartPlaylist> {
  const response = await apiClient.post('/recommendations/smart-playlist', {
    name: 'Autoplay',
    artistId,
    maxTracks: limit,
  });
  return response.data;
}

/**
 * Generate smart playlist by genre
 */
export async function getSmartPlaylistByGenre(
  genreId: string,
  limit: number = 20
): Promise<SmartPlaylist> {
  const response = await apiClient.post('/recommendations/smart-playlist', {
    name: 'Genre Mix',
    genreId,
    maxTracks: limit,
  });
  return response.data;
}

/**
 * Calculate scores for specific tracks
 */
export async function calculateTrackScores(
  trackIds: string[]
): Promise<ScoredTrack[]> {
  const response = await apiClient.post('/recommendations/calculate-score', {
    trackIds,
  });
  return response.data;
}
