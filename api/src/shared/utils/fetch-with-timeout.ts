/**
 * Fetch with timeout utility
 * Prevents hanging requests to external APIs
 */

import { TimeoutError } from '@shared/errors';

export interface FetchOptions extends RequestInit {
  timeout?: number; // in milliseconds
}

/**
 * Fetch wrapper with timeout support
 * Default timeout: 10 seconds
 *
 * @param url URL to fetch
 * @param options Fetch options with optional timeout
 * @returns Response
 * @throws TimeoutError if timeout is reached
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(timeout, 'HTTP request');
    }
    throw error;
  }
}
