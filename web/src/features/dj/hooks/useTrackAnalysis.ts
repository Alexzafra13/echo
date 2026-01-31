/**
 * useTrackAnalysis Hook
 *
 * Hook for fetching and caching track DJ analysis data.
 * Automatically triggers analysis for tracks that haven't been analyzed.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { djService } from '../services/dj.service';
import { useDjFlowStore } from '../store/djFlowStore';
import type { DjAnalysis } from '../types';

const ANALYSIS_QUERY_KEY = 'dj-analysis';

interface UseTrackAnalysisOptions {
  /** Auto-trigger analysis if not found */
  autoAnalyze?: boolean;
  /** Only fetch if DJ Flow is enabled */
  onlyWhenEnabled?: boolean;
}

/**
 * Hook to get analysis for a single track
 */
export function useTrackAnalysis(
  trackId: string | null | undefined,
  options: UseTrackAnalysisOptions = {}
) {
  const { autoAnalyze = true, onlyWhenEnabled = true } = options;
  const djFlowEnabled = useDjFlowStore((state) => state.settings.enabled);
  const setAnalysis = useDjFlowStore((state) => state.setAnalysis);
  const cachedAnalysis = useDjFlowStore((state) =>
    trackId ? state.getAnalysis(trackId) : undefined
  );

  const queryClient = useQueryClient();

  // Mutation to trigger analysis
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => djService.analyzeTrack(id),
    onSuccess: () => {
      // Invalidate query to refetch after analysis is queued
      if (trackId) {
        // Poll for completion
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: [ANALYSIS_QUERY_KEY, trackId],
          });
        }, 2000);
      }
    },
  });

  // Query to fetch analysis
  const query = useQuery({
    queryKey: [ANALYSIS_QUERY_KEY, trackId],
    queryFn: async () => {
      if (!trackId) return null;

      const analysis = await djService.getAnalysis(trackId);

      // Cache in store
      if (analysis) {
        setAnalysis(trackId, analysis);
      }

      // Auto-trigger analysis if not found or failed
      if (autoAnalyze && (!analysis || analysis.status === 'failed')) {
        analyzeMutation.mutate(trackId);
      }

      return analysis;
    },
    enabled: !!trackId && (!onlyWhenEnabled || djFlowEnabled),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Return cached data while fetching
    placeholderData: cachedAnalysis || undefined,
    // Refetch if status is pending/processing
    refetchInterval: (query) => {
      const data = query.state.data as DjAnalysis | null;
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 3000; // Poll every 3 seconds
      }
      return false;
    },
  });

  return {
    analysis: query.data,
    isLoading: query.isLoading,
    isAnalyzing:
      query.data?.status === 'pending' ||
      query.data?.status === 'processing' ||
      analyzeMutation.isPending,
    error: query.error,
    refetch: query.refetch,
    triggerAnalysis: () => trackId && analyzeMutation.mutate(trackId),
  };
}

/**
 * Hook to get analysis for multiple tracks
 */
export function useTracksAnalysis(
  trackIds: string[],
  options: UseTrackAnalysisOptions = {}
) {
  const { onlyWhenEnabled = true } = options;
  const djFlowEnabled = useDjFlowStore((state) => state.settings.enabled);
  const setAnalysis = useDjFlowStore((state) => state.setAnalysis);

  return useQuery({
    queryKey: [ANALYSIS_QUERY_KEY, 'batch', trackIds.sort().join(',')],
    queryFn: async () => {
      if (trackIds.length === 0) return new Map<string, DjAnalysis>();

      const analysisMap = await djService.getAnalysisBatch(trackIds);

      // Cache all in store
      analysisMap.forEach((analysis, id) => {
        setAnalysis(id, analysis);
      });

      return analysisMap;
    },
    enabled: trackIds.length > 0 && (!onlyWhenEnabled || djFlowEnabled),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to manually trigger analysis
 */
export function useAnalyzeTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) => djService.analyzeTrack(trackId),
    onSuccess: (_, trackId) => {
      // Invalidate to trigger refetch
      queryClient.invalidateQueries({
        queryKey: [ANALYSIS_QUERY_KEY, trackId],
      });
    },
  });
}
