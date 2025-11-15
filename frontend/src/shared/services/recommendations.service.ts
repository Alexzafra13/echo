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
  temporalDistribution: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

/**
 * Daily Mix response
 */
export interface DailyMix {
  id: string;
  userId: string;
  name: string;
  description: string;
  tracks: ScoredTrack[];
  createdAt: string;
  expiresAt: string;
  metadata: DailyMixMetadata;
}

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
 * Get Daily Mix
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
    artistId,
    limit,
  });
  return response.data;
}

/**
 * Generate smart playlist by genre
 */
export async function getSmartPlaylistByGenre(
  genre: string,
  limit: number = 20
): Promise<SmartPlaylist> {
  const response = await apiClient.post('/recommendations/smart-playlist', {
    genre,
    limit,
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
