/**
 * Stream Proxy Utilities
 *
 * Handles proxying of HTTP streams when running on HTTPS to avoid
 * Mixed Content blocking by browsers.
 */

import { logger } from '@shared/utils/logger';

/**
 * Gets the proper stream URL, using nginx proxy for HTTP streams when on HTTPS
 * This fixes the Mixed Content issue where browsers block HTTP content on HTTPS pages
 */
export function getProxiedStreamUrl(streamUrl: string): string {
  const isHttpsPage = window.location.protocol === 'https:';
  const isHttpStream = streamUrl.startsWith('http://');

  if (isHttpsPage && isHttpStream) {
    // Use nginx proxy to avoid Mixed Content blocking
    const proxyUrl = `/api/radio/stream/proxy?url=${encodeURIComponent(streamUrl)}`;
    logger.debug('[StreamProxy] Using proxy for HTTP stream:', streamUrl);
    return proxyUrl;
  }

  return streamUrl;
}
