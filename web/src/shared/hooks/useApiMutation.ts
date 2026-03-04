import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type InvalidateQueryFilters,
} from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { logger } from '@shared/utils/logger';

interface UseApiMutationOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn' | 'onError' | 'onSuccess'
> {
  /** The async function to execute */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Default error message if none can be extracted from the API response */
  defaultErrorMessage?: string;
  /** Feature name for dev logging (e.g., '[AlbumCovers]') */
  logTag?: string;
  /** Query keys to invalidate on success */
  invalidateKeys?: InvalidateQueryFilters['queryKey'][];
  /** Called on success after invalidation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on error after standard handling */
  onError?: (error: string, rawError: Error, variables: TVariables) => void;
}

/**
 * Wrapper around useMutation that standardizes error handling.
 *
 * - Extracts user-friendly error messages from API responses
 * - Logs errors in development mode
 * - Invalidates specified query keys on success
 * - Exposes `error` as a string ready to display
 *
 * @example
 * ```tsx
 * const { mutate, error, clearError, isPending } = useApiMutation({
 *   mutationFn: (req: ApplyRequest) => api.apply(req),
 *   defaultErrorMessage: 'Error al aplicar',
 *   logTag: '[AlbumCovers]',
 *   invalidateKeys: [queryKeys.albums.all],
 *   onSuccess: () => onClose(),
 * });
 * ```
 */
export function useApiMutation<TData = unknown, TVariables = void>({
  mutationFn,
  defaultErrorMessage = 'Ha ocurrido un error',
  logTag,
  invalidateKeys,
  onSuccess,
  onError,
  ...rest
}: UseApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const mutation = useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: async (data, variables) => {
      setError(null);
      if (invalidateKeys?.length) {
        await Promise.all(
          invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
        );
      }
      onSuccess?.(data, variables);
    },
    onError: (err, variables) => {
      const message = getApiErrorMessage(err, defaultErrorMessage);
      if (import.meta.env.DEV && logTag) {
        logger.error(`${logTag} Error:`, err);
      }
      setError(message);
      onError?.(message, err, variables);
    },
    ...rest,
  });

  return {
    ...mutation,
    error,
    clearError,
  };
}
