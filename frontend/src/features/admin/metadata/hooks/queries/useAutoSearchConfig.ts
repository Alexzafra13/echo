/**
 * Auto-Search Config Query Hook
 *
 * React Query hook for fetching auto-search configuration
 */

import { useQuery } from '@tanstack/react-query';
import { getAutoSearchConfig } from '../../api/metadata.api';

/**
 * Query key factory for auto-search config
 */
export const autoSearchConfigKeys = {
  all: ['autoSearchConfig'] as const,
};

/**
 * Get auto-search configuration
 *
 * @returns Query with auto-search config data
 *
 * @example
 * ```tsx
 * function AutoSearchSettings() {
 *   const { data: config, isLoading } = useAutoSearchConfig();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Enabled: {config.enabled ? 'Yes' : 'No'}</p>
 *       <p>Threshold: {config.confidenceThreshold}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoSearchConfig() {
  return useQuery({
    queryKey: autoSearchConfigKeys.all,
    queryFn: getAutoSearchConfig,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}
