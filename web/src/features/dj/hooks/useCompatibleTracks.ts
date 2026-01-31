/**
 * useCompatibleTracks Hook
 *
 * Hook for fetching harmonically compatible tracks
 * for a given source track.
 */

import { useQuery } from '@tanstack/react-query';
import { djService } from '../services/dj.service';
import { useDjFlowStore } from '../store/djFlowStore';
import type { TrackCompatibility } from '../types';

const COMPATIBLE_QUERY_KEY = 'dj-compatible';

interface UseCompatibleTracksOptions {
  /** BPM tolerance percentage (default: 6) */
  bpmTolerance?: number;
  /** Maximum number of results (default: 20) */
  limit?: number;
  /** Only fetch when DJ Flow is enabled */
  onlyWhenEnabled?: boolean;
  /** Minimum compatibility score to include */
  minScore?: number;
}

/**
 * Hook to get harmonically compatible tracks
 */
export function useCompatibleTracks(
  trackId: string | null | undefined,
  options: UseCompatibleTracksOptions = {}
) {
  const {
    bpmTolerance = 6,
    limit = 20,
    onlyWhenEnabled = true,
    minScore = 0,
  } = options;

  const djFlowEnabled = useDjFlowStore((state) => state.settings.enabled);

  const query = useQuery({
    queryKey: [COMPATIBLE_QUERY_KEY, trackId, bpmTolerance, limit],
    queryFn: async (): Promise<TrackCompatibility[]> => {
      if (!trackId) return [];

      const tracks = await djService.getCompatibleTracks(trackId, {
        bpmTolerance,
        limit,
      });

      // Filter by minimum score if specified
      if (minScore > 0) {
        return tracks.filter((t) => t.overallScore >= minScore);
      }

      return tracks;
    },
    enabled: !!trackId && (!onlyWhenEnabled || djFlowEnabled),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    compatibleTracks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to get the best next track from compatible options
 */
export function useBestNextTrack(
  trackId: string | null | undefined,
  excludeTrackIds: string[] = []
) {
  const djFlowSettings = useDjFlowStore((state) => state.settings);
  const { compatibleTracks, isLoading } = useCompatibleTracks(trackId, {
    limit: 50, // Get more to filter
  });

  // Filter out excluded tracks
  const availableTracks = compatibleTracks.filter(
    (t) => !excludeTrackIds.includes(t.trackId)
  );

  // Sort based on priority setting
  const sortedTracks = [...availableTracks].sort((a, b) => {
    switch (djFlowSettings.priority) {
      case 'harmonic':
        return b.harmonicScore - a.harmonicScore;
      case 'bpm':
        return Math.abs(a.bpmDifference) - Math.abs(b.bpmDifference);
      case 'energy':
        // For energy, we'd need energy data - use overall score as fallback
        return b.overallScore - a.overallScore;
      default:
        return b.overallScore - a.overallScore;
    }
  });

  return {
    bestTrack: sortedTracks[0] ?? null,
    alternatives: sortedTracks.slice(1, 5),
    isLoading,
  };
}

/**
 * Utility to get compatibility indicator
 */
export function getCompatibilityIndicator(score: number): {
  emoji: string;
  label: string;
  color: string;
} {
  if (score >= 90) {
    return { emoji: '🟢', label: 'Perfect', color: '#22c55e' };
  }
  if (score >= 75) {
    return { emoji: '🟢', label: 'Harmonic', color: '#22c55e' };
  }
  if (score >= 50) {
    return { emoji: '🟡', label: 'Compatible', color: '#eab308' };
  }
  if (score >= 25) {
    return { emoji: '🟠', label: 'Possible', color: '#f97316' };
  }
  return { emoji: '🔴', label: 'Clash', color: '#ef4444' };
}
