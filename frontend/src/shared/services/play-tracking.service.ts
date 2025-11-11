/**
 * Play Tracking Service
 *
 * Handles communication with the play tracking API endpoints.
 * Tracks user play behavior including context, completion rates, and skip events.
 *
 * @module play-tracking.service
 */

import { apiClient } from './api-client';

/**
 * Play context types
 * Determines how a track was initiated for weighted scoring
 */
export type PlayContext =
  | 'direct'         // Direct play from track list (weight: 1.0)
  | 'search'         // From search results (weight: 0.9)
  | 'playlist'       // From playlist (weight: 0.8)
  | 'artist'         // From artist page (weight: 0.75)
  | 'queue'          // From queue (weight: 0.7)
  | 'album'          // From album view (weight: 0.6)
  | 'recommendation' // From recommendations (weight: 0.7)
  | 'radio'          // From radio/discovery (weight: 0.4)
  | 'shuffle';       // From shuffle mode (weight: 0.2)

/**
 * Source type for play tracking
 */
export type SourceType = 'playlist' | 'album' | 'artist' | 'search' | 'queue' | 'recommendation';

/**
 * Play event data to send to backend
 */
export interface RecordPlayData {
  trackId: string;
  playContext: PlayContext;
  completionRate?: number;
  skipped?: boolean;
  sourceId?: string;
  sourceType?: SourceType;
}

/**
 * Skip event data
 */
export interface RecordSkipData {
  trackId: string;
  timeListened: number;
  totalDuration: number;
  playContext: PlayContext;
  sourceId?: string;
  sourceType?: SourceType;
}

/**
 * Play history entry
 */
export interface PlayHistoryEntry {
  id: string;
  userId: string;
  trackId: string;
  playedAt: string;
  playContext: PlayContext;
  completionRate?: number;
  skipped: boolean;
  sourceId?: string;
  sourceType?: SourceType;
  track?: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
  };
}

/**
 * User play summary statistics
 */
export interface PlaySummary {
  totalPlays: number;
  uniqueTracks: number;
  totalListeningTime: number; // in seconds
  avgCompletionRate?: number;
  topPlayContext?: PlayContext;
  recentActivity: {
    last7Days: number;
    last30Days: number;
  };
}

/**
 * Top track with play stats
 */
export interface TopTrack {
  trackId: string;
  playCount: number;
  weightedPlayCount: number;
  avgCompletionRate?: number;
  skipCount: number;
  lastPlayedAt: string;
  track?: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
  };
}

/**
 * Recently played track
 */
export interface RecentlyPlayed {
  trackId: string;
  playedAt: string;
  playContext: PlayContext;
  completionRate?: number;
  track?: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
  };
}

/**
 * Record a play event
 * Called when a track completes or reaches significant playback
 */
export async function recordPlay(data: RecordPlayData): Promise<void> {
  try {
    await apiClient.post('/play-tracking/play', data);
  } catch (error: any) {
    console.error('[PlayTracking] Failed to record play:', error.response?.data || error.message);
    // Don't throw - tracking failures shouldn't break the player
  }
}

/**
 * Record a skip event
 * Called when user skips to next track before completion
 */
export async function recordSkip(data: RecordSkipData): Promise<void> {
  try {
    const completionRate = data.totalDuration > 0
      ? data.timeListened / data.totalDuration
      : 0;

    await apiClient.post('/play-tracking/skip', {
      trackId: data.trackId,
      playContext: data.playContext,
      completionRate,
      sourceId: data.sourceId,
      sourceType: data.sourceType,
    });
  } catch (error: any) {
    console.error('[PlayTracking] Failed to record skip:', error.response?.data || error.message);
    // Don't throw - tracking failures shouldn't break the player
  }
}

/**
 * Get user's play history
 */
export async function getPlayHistory(limit: number = 50): Promise<PlayHistoryEntry[]> {
  const response = await apiClient.get(`/play-tracking/history?limit=${limit}`);
  return response.data;
}

/**
 * Get user's top tracks
 */
export async function getTopTracks(
  limit: number = 20,
  timeRange: 'week' | 'month' | 'all' = 'all'
): Promise<TopTrack[]> {
  const response = await apiClient.get(`/play-tracking/top-tracks?limit=${limit}&timeRange=${timeRange}`);
  return response.data;
}

/**
 * Get recently played tracks
 */
export async function getRecentlyPlayed(limit: number = 20): Promise<RecentlyPlayed[]> {
  const response = await apiClient.get(`/play-tracking/recently-played?limit=${limit}`);
  return response.data;
}

/**
 * Get user's play summary statistics
 */
export async function getPlaySummary(): Promise<PlaySummary> {
  const response = await apiClient.get('/play-tracking/summary');
  return response.data;
}
