import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
