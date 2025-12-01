/**
 * Validate Storage Path Mutation Hook
 *
 * React Query mutation for validating storage paths.
 */

import { useMutation } from '@tanstack/react-query';
import { validateStoragePath } from '../../api/metadata.api';
import type { StorageValidationResult } from '../../types';

/**
 * Validate storage path
 *
 * @returns Mutation function with validation state
 *
 * @example
 * ```tsx
 * function PathInput() {
 *   const validatePath = useValidateStoragePath();
 *
 *   const handleValidate = (path: string) => {
 *     validatePath.mutate(path, {
 *       onSuccess: (result) => {
 *         if (result.valid) {
 *           console.log('Path is valid!');
 *         }
 *       },
 *     });
 *   };
 *
 *   return (
 *     <input
 *       onBlur={(e) => handleValidate(e.target.value)}
 *       disabled={validatePath.isPending}
 *     />
 *   );
 * }
 * ```
 */
export function useValidateStoragePath() {
  return useMutation<StorageValidationResult, Error, string>({
    mutationFn: (path: string) => validateStoragePath(path),
  });
}
