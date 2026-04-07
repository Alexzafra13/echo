import axios from 'axios';

/**
 * API error response structure from backend
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Extracts a user-friendly error message from an API error
 *
 * @param error - The caught error (typically from axios)
 * @param defaultMessage - Fallback message if error message cannot be extracted
 * @returns A user-friendly error message string
 *
 * @example
 * ```tsx
 * try {
 *   await apiClient.post('/endpoint');
 * } catch (error) {
 *   setError(getApiErrorMessage(error, 'Error al procesar la solicitud'));
 * }
 * ```
 */
export function getApiErrorMessage(error: unknown, defaultMessage: string): string {
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.message || data?.error || defaultMessage;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

