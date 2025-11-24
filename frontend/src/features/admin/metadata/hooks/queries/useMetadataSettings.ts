/**
 * Metadata Settings Query Hook
 *
 * React Query hook for fetching metadata settings.
 * Provides automatic caching, refetching, and loading states.
 */

import { useQuery } from '@tanstack/react-query';
import { getSettings } from '../../api/metadata.api';

/**
 * Query key for metadata settings
 */
export const metadataSettingsKeys = {
  all: ['metadata-settings'] as const,
  detail: () => [...metadataSettingsKeys.all, 'detail'] as const,
};

/**
 * Fetch metadata settings
 *
 * @returns Query result with settings data, loading state, and error
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: settings, isLoading, error } = useMetadataSettings();
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error />;
 *
 *   return <div>{settings.autoEnrichEnabled ? 'Enabled' : 'Disabled'}</div>;
 * }
 * ```
 */
export function useMetadataSettings() {
  return useQuery({
    queryKey: metadataSettingsKeys.all,
    queryFn: getSettings,
    staleTime: 60000, // 1 minute - settings don't change frequently
    gcTime: 300000, // 5 minutes - keep in cache
  });
}
