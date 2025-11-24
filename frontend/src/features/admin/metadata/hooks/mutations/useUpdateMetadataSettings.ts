/**
 * Update Metadata Settings Mutation Hook
 *
 * React Query mutation for updating metadata settings.
 * Provides optimistic updates and automatic cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSetting } from '../../api/metadata.api';
import { metadataSettingsKeys } from '../queries/useMetadataSettings';

/**
 * Settings update payload
 */
export interface UpdateSettingsPayload {
  autoEnrichEnabled?: boolean;
  providers?: {
    lastfm?: { apiKey: string };
    fanart?: { apiKey: string };
  };
  storage?: {
    mode?: 'centralized' | 'portable';
    path?: string;
  };
  autoSearch?: {
    enabled?: boolean;
    confidenceThreshold?: number;
    autoApply?: boolean;
  };
}

/**
 * Update metadata settings
 *
 * @returns Mutation function with loading state and error handling
 *
 * @example
 * ```tsx
 * function SettingsForm() {
 *   const updateSettings = useUpdateMetadataSettings();
 *
 *   const handleSave = () => {
 *     updateSettings.mutate({
 *       autoEnrichEnabled: true,
 *       providers: {
 *         lastfm: { apiKey: 'abc123' },
 *       },
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSave} disabled={updateSettings.isPending}>
 *       {updateSettings.isPending ? 'Guardando...' : 'Guardar'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useUpdateMetadataSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateSettingsPayload) => {
      const promises: Promise<void>[] = [];

      // Update auto-enrich
      if (updates.autoEnrichEnabled !== undefined) {
        promises.push(
          updateSetting('metadata.auto_enrich.enabled', updates.autoEnrichEnabled.toString())
        );
      }

      // Update Last.fm API key
      if (updates.providers?.lastfm?.apiKey !== undefined) {
        promises.push(
          updateSetting('metadata.lastfm.api_key', updates.providers.lastfm.apiKey)
        );
      }

      // Update Fanart.tv API key
      if (updates.providers?.fanart?.apiKey !== undefined) {
        promises.push(
          updateSetting('metadata.fanart.api_key', updates.providers.fanart.apiKey)
        );
      }

      // Update storage mode
      if (updates.storage?.mode !== undefined) {
        promises.push(
          updateSetting('metadata.storage.location', updates.storage.mode)
        );
      }

      // Update storage path
      if (updates.storage?.path !== undefined) {
        promises.push(
          updateSetting('metadata.storage.path', updates.storage.path)
        );
      }

      // Update auto-search enabled
      if (updates.autoSearch?.enabled !== undefined) {
        promises.push(
          updateSetting('metadata.mbid_auto_search.enabled', updates.autoSearch.enabled.toString())
        );
      }

      // Update auto-search confidence threshold
      if (updates.autoSearch?.confidenceThreshold !== undefined) {
        promises.push(
          updateSetting('metadata.mbid_auto_search.confidence_threshold', updates.autoSearch.confidenceThreshold.toString())
        );
      }

      // Update auto-search auto-apply
      if (updates.autoSearch?.autoApply !== undefined) {
        promises.push(
          updateSetting('metadata.mbid_auto_search.auto_apply', updates.autoSearch.autoApply.toString())
        );
      }

      // Execute all updates in parallel
      await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: metadataSettingsKeys.all });
    },
  });
}
