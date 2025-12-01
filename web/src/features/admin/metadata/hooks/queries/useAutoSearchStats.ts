/**
 * Auto-Search Stats Query Hook
 *
 * React Query hook for fetching auto-search statistics
 */

import { useQuery } from '@tanstack/react-query';
import { getAutoSearchStats } from '../../api/metadata.api';

/**
 * Query key factory for auto-search stats
 */
export const autoSearchStatsKeys = {
  all: ['autoSearchStats'] as const,
};

/**
 * Get auto-search statistics
 *
 * @returns Query with auto-search stats data
 *
 * @example
 * ```tsx
 * function AutoSearchStatistics() {
 *   const { data: stats, isLoading } = useAutoSearchStats();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Total: {stats.totalProcessed}</p>
 *       <p>Auto-applied: {stats.successRate}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoSearchStats() {
  return useQuery({
    queryKey: autoSearchStatsKeys.all,
    queryFn: getAutoSearchStats,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}
