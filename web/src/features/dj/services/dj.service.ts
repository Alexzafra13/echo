/**
 * DJ Service
 *
 * Handles all DJ-related API calls including:
 * - Track analysis (BPM, Key, Energy)
 * - Harmonic compatibility suggestions
 * - Transition calculations
 * - System status
 */

import { apiClient } from '@shared/services/api';
import type {
  DjAnalysis,
  TrackCompatibility,
  TransitionParams,
  TransitionResult,
  DjSystemStatus,
  AnalyzeResponse,
  AnalyzePlaylistResponse,
  DjSuggestionsResponse,
} from '../types';

export const djService = {
  // ============================================
  // Analysis endpoints
  // ============================================

  /**
   * Analyze a single track
   * Queues the track for BPM, Key, Energy analysis
   */
  analyzeTrack: async (trackId: string): Promise<AnalyzeResponse> => {
    const { data } = await apiClient.post<AnalyzeResponse>(
      `/dj/analyze/track/${trackId}`
    );
    return data;
  },

  /**
   * Analyze all tracks in a playlist
   */
  analyzePlaylist: async (
    playlistId: string,
    processStems = false
  ): Promise<AnalyzePlaylistResponse> => {
    const { data } = await apiClient.post<AnalyzePlaylistResponse>(
      `/dj/analyze/playlist/${playlistId}`,
      { processStems }
    );
    return data;
  },

  /**
   * Get analysis for a specific track
   */
  getAnalysis: async (trackId: string): Promise<DjAnalysis | null> => {
    try {
      const { data } = await apiClient.get<DjAnalysis>(
        `/dj/analysis/${trackId}`
      );
      return data;
    } catch (error: unknown) {
      // Return null if not found (404)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return null;
        }
      }
      throw error;
    }
  },

  /**
   * Get analysis for multiple tracks
   */
  getAnalysisBatch: async (trackIds: string[]): Promise<Map<string, DjAnalysis>> => {
    const { data } = await apiClient.post<DjAnalysis[]>(
      '/dj/analysis/batch',
      { trackIds }
    );

    const map = new Map<string, DjAnalysis>();
    data.forEach((analysis) => {
      map.set(analysis.trackId, analysis);
    });
    return map;
  },

  // ============================================
  // Compatibility endpoints
  // ============================================

  /**
   * Get tracks that are harmonically compatible with the given track
   */
  getCompatibleTracks: async (
    trackId: string,
    options?: { bpmTolerance?: number; limit?: number }
  ): Promise<TrackCompatibility[]> => {
    const { data } = await apiClient.get<TrackCompatibility[]>(
      `/dj/compatible/${trackId}`,
      { params: options }
    );
    return data;
  },

  /**
   * Get smart DJ suggestions for the next track
   * Uses BPM, Key (Camelot), and Energy for scoring
   */
  getSuggestions: async (
    trackId: string,
    options?: {
      limit?: number;
      minScore?: number;
      prioritize?: 'bpm' | 'key' | 'energy' | 'balanced';
    }
  ): Promise<DjSuggestionsResponse> => {
    const { data } = await apiClient.get<DjSuggestionsResponse>(
      `/dj/suggestions/${trackId}`,
      { params: options }
    );
    return data;
  },

  // ============================================
  // Transition endpoints
  // ============================================

  /**
   * Calculate optimal transition between two tracks
   */
  calculateTransition: async (
    params: TransitionParams
  ): Promise<TransitionResult> => {
    const { data } = await apiClient.post<TransitionResult>(
      '/dj/transition/calculate',
      params
    );
    return data;
  },

  // ============================================
  // Status endpoints
  // ============================================

  /**
   * Get DJ system status (analysis queue, available backends)
   */
  getStatus: async (): Promise<DjSystemStatus> => {
    const { data } = await apiClient.get<DjSystemStatus>('/dj/status');
    return data;
  },

  // ============================================
  // Utility methods
  // ============================================

  /**
   * Check if a track has been analyzed
   */
  isAnalyzed: async (trackId: string): Promise<boolean> => {
    const analysis = await djService.getAnalysis(trackId);
    return analysis?.status === 'completed';
  },

  /**
   * Trigger analysis for a track if not already analyzed
   */
  ensureAnalyzed: async (trackId: string): Promise<DjAnalysis | null> => {
    const existing = await djService.getAnalysis(trackId);

    if (existing?.status === 'completed') {
      return existing;
    }

    if (!existing || existing.status === 'failed') {
      await djService.analyzeTrack(trackId);
    }

    return existing;
  },
};

export default djService;
