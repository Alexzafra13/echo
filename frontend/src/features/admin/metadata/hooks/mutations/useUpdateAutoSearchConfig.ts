/**
 * Update Auto-Search Config Mutation Hook
 *
 * React Query mutation for updating auto-search configuration
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAutoSearchConfig } from '../../api/metadata.api';
import { autoSearchConfigKeys } from '../queries/useAutoSearchConfig';
import type { AutoSearchConfig } from '../../types';

/**
 * Update auto-search configuration
 *
 * @returns Mutation function with loading state
 *
 * @example
 * ```tsx
 * function AutoSearchSettings() {
 *   const updateConfig = useUpdateAutoSearchConfig();
 *
 *   const handleSave = () => {
 *     updateConfig.mutate(
 *       { enabled: true, confidenceThreshold: 90 },
 *       {
 *         onSuccess: () => console.log('Config updated!'),
 *         onError: (error) => console.error('Failed:', error),
 *       }
 *     );
 *   };
 *
 *   return (
 *     <button onClick={handleSave} disabled={updateConfig.isPending}>
 *       {updateConfig.isPending ? 'Saving...' : 'Save'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useUpdateAutoSearchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<AutoSearchConfig>) => updateAutoSearchConfig(config),
    onSuccess: () => {
      // Invalidate and refetch config
      queryClient.invalidateQueries({ queryKey: autoSearchConfigKeys.all });
    },
  });
}
