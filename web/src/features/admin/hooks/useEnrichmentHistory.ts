import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  enrichmentApi,
  ListEnrichmentLogsFilters,
} from '../api/enrichment.api';

export function useEnrichmentLogs(filters?: ListEnrichmentLogsFilters) {
  return useQuery({
    queryKey: ['enrichmentLogs', filters],
    queryFn: () => enrichmentApi.listEnrichmentLogs(filters),
  });
}

export function useEnrichmentStats(
  period?: 'today' | 'week' | 'month' | 'all',
) {
  return useQuery({
    queryKey: ['enrichmentStats', period],
    queryFn: () => enrichmentApi.getEnrichmentStats(period),
    // Keep previous data while fetching new data for smooth transitions
    placeholderData: keepPreviousData,
  });
}

/**
 * Auto-backfill enrichment logs when the history is empty for artists/albums
 * but data exists in the system (enrichment happened before logging was implemented)
 */
export function useEnrichmentBackfill(stats: { byEntityType?: { artist: number; album: number } } | undefined) {
  const queryClient = useQueryClient();
  const backfillAttempted = useRef(false);

  useEffect(() => {
    if (!stats || backfillAttempted.current) return;

    const hasArtistOrAlbumLogs = (stats.byEntityType?.artist ?? 0) > 0 || (stats.byEntityType?.album ?? 0) > 0;

    if (!hasArtistOrAlbumLogs) {
      backfillAttempted.current = true;
      enrichmentApi.backfillLogs().then((result) => {
        if (result.created > 0) {
          // Refresh queries to show the new data
          queryClient.invalidateQueries({ queryKey: ['enrichmentLogs'] });
          queryClient.invalidateQueries({ queryKey: ['enrichmentStats'] });
        }
      }).catch(() => {
        // Silently ignore backfill errors
      });
    }
  }, [stats, queryClient]);
}
