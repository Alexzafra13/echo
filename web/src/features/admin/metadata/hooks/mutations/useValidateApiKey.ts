/**
 * Validate API Key Mutation Hook
 *
 * React Query mutation for validating external provider API keys.
 */

import { useMutation } from '@tanstack/react-query';
import { validateApiKey } from '../../api/metadata.api';
import type { ProviderValidationResult } from '../../types';

/**
 * API key validation payload
 */
export interface ValidateApiKeyPayload {
  service: 'lastfm' | 'fanart';
  apiKey: string;
}

/**
 * Validate API key
 *
 * @returns Mutation function with validation result
 *
 * @example
 * ```tsx
 * function ApiKeyInput() {
 *   const validateKey = useValidateApiKey();
 *   const [key, setKey] = useState('');
 *
 *   const handleValidate = async () => {
 *     const result = await validateKey.mutateAsync({
 *       service: 'lastfm',
 *       apiKey: key,
 *     });
 *
 *     if (result.valid) {
 *       alert('API key válida!');
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <input value={key} onChange={(e) => setKey(e.target.value)} />
 *       <button onClick={handleValidate} disabled={validateKey.isPending}>
 *         {validateKey.isPending ? 'Validando...' : 'Validar'}
 *       </button>
 *     </>
 *   );
 * }
 * ```
 */
export function useValidateApiKey() {
  return useMutation({
    mutationFn: ({ service, apiKey }: ValidateApiKeyPayload): Promise<ProviderValidationResult> => {
      return validateApiKey(service, apiKey);
    },
  });
}
