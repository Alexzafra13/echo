import { useState, useEffect } from 'react';
import { apiClient } from '@shared/services/api';
import type { DjAnalysis } from '@shared/types/dj-analysis.types';

interface UseTrackDjAnalysisResult {
  djAnalysis: DjAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch DJ analysis data for a track
 * @param trackId - The track ID to fetch analysis for
 * @returns DJ analysis data, loading state, and error
 */
export function useTrackDjAnalysis(trackId: string | null): UseTrackDjAnalysisResult {
  const [djAnalysis, setDjAnalysis] = useState<DjAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) {
      setDjAnalysis(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchDjAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<DjAnalysis | null>(`/tracks/${trackId}/dj`);
        setDjAnalysis(response.data);
      } catch (err) {
        setError('Error al cargar el análisis DJ');
        setDjAnalysis(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDjAnalysis();
  }, [trackId]);

  return { djAnalysis, isLoading, error };
}
