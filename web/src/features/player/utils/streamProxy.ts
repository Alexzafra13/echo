import { logger } from '@shared/utils/logger';

// Proxy para streams HTTP cuando la página es HTTPS (Mixed Content)
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
