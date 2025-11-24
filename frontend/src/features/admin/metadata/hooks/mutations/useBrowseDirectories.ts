/**
 * Browse Directories Mutation Hook
 *
 * React Query mutation for browsing directories.
 */

import { useMutation } from '@tanstack/react-query';
import { browseDirectories } from '../../api/metadata.api';
import type { DirectoryBrowseResult } from '../../types';

/**
 * Browse directories for storage path selection
 *
 * @returns Mutation function with browse state
 *
 * @example
 * ```tsx
 * function DirectoryBrowser() {
 *   const browse = useBrowseDirectories();
 *
 *   const handleNavigate = (path: string) => {
 *     browse.mutate(path, {
 *       onSuccess: (result) => {
 *         console.log('Current path:', result.currentPath);
 *         console.log('Directories:', result.directories);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <button
 *       onClick={() => handleNavigate('/app')}
 *       disabled={browse.isPending}
 *     >
 *       Browse /app
 *     </button>
 *   );
 * }
 * ```
 */
export function useBrowseDirectories() {
  return useMutation<DirectoryBrowseResult, Error, string | undefined>({
    mutationFn: (path?: string) => browseDirectories(path),
  });
}
