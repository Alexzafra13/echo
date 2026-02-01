/**
 * useDjSuggestions Hook
 *
 * Hook for fetching DJ track suggestions based on harmonic mixing rules.
 * Uses BPM, Key (Camelot), and Energy to score compatibility.
 */

import { useQuery } from '@tanstack/react-query';
import { djService } from '../services/dj.service';
import { useDjFlowStore } from '../store/djFlowStore';
import type { DjSuggestionsResponse } from '../types';

const SUGGESTIONS_QUERY_KEY = 'dj-suggestions';

interface UseDjSuggestionsOptions {
  /** Number of suggestions to return */
  limit?: number;
  /** Minimum compatibility score (0-100) */
  minScore?: number;
  /** What to prioritize in scoring */
  prioritize?: 'bpm' | 'key' | 'energy' | 'balanced';
  /** Only fetch when DJ Flow is enabled */
  onlyWhenEnabled?: boolean;
}

/**
 * Hook to get DJ suggestions for a track
 */
export function useDjSuggestions(
  trackId: string | null | undefined,
  options: UseDjSuggestionsOptions = {}
) {
  const {
    limit = 5,
    minScore = 50,
    prioritize = 'balanced',
    onlyWhenEnabled = true,
  } = options;

  const djFlowEnabled = useDjFlowStore((state) => state.settings.enabled);

  const query = useQuery({
    queryKey: [SUGGESTIONS_QUERY_KEY, trackId, { limit, minScore, prioritize }],
    queryFn: async (): Promise<DjSuggestionsResponse | null> => {
      if (!trackId) return null;
      return djService.getSuggestions(trackId, { limit, minScore, prioritize });
    },
    enabled: !!trackId && (!onlyWhenEnabled || djFlowEnabled),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    suggestions: query.data?.suggestions ?? [],
    currentTrack: query.data?.currentTrack ?? null,
    compatibleKeys: query.data?.compatibleKeys ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Get the best suggestion (highest overall score)
 */
export function useBestSuggestion(trackId: string | null | undefined) {
  const { suggestions, isLoading } = useDjSuggestions(trackId, { limit: 1 });
  return {
    bestSuggestion: suggestions[0] ?? null,
    isLoading,
  };
}

export default useDjSuggestions;
