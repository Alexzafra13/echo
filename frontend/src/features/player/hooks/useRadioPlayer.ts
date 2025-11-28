/**
 * useRadioPlayer Hook
 *
 * Manages radio station playback functionality.
 * Handles radio-specific streaming logic and error handling.
 */

import { useCallback } from 'react';
import { logger } from '@shared/utils/logger';
import type { RadioStation, RadioBrowserStation } from '@shared/types/radio.types';

/**
 * Gets the proper stream URL, using nginx proxy for HTTP streams when on HTTPS
 * This fixes the Mixed Content issue where browsers block HTTP content on HTTPS pages
 */
function getProxiedStreamUrl(streamUrl: string): string {
  // Check if we're on HTTPS and the stream is HTTP
  const isHttpsPage = window.location.protocol === 'https:';
  const isHttpStream = streamUrl.startsWith('http://');

  if (isHttpsPage && isHttpStream) {
    // Use nginx proxy to avoid Mixed Content blocking
    const proxyUrl = `/api/radio/stream/proxy?url=${encodeURIComponent(streamUrl)}`;
    logger.debug('[Player] Using proxy for HTTP stream:', streamUrl);
    return proxyUrl;
  }

  // Stream is already HTTPS or we're on HTTP page - use directly
  return streamUrl;
}

interface UseRadioPlayerParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onRadioStateChange: (station: RadioStation | RadioBrowserStation | null, isPlaying: boolean) => void;
}

export function useRadioPlayer({
  audioRef,
  onRadioStateChange
}: UseRadioPlayerParams) {

  /**
   * Play radio station
   */
  const playRadio = useCallback((station: RadioStation | RadioBrowserStation) => {
    if (!audioRef.current) return;

    // Use url_resolved if available (better quality), fallback to url
    const streamUrl = 'urlResolved' in station
      ? station.urlResolved
      : 'url_resolved' in station
        ? station.url_resolved
        : station.url;

    if (!streamUrl) {
      logger.error('[Player] Radio station has no valid stream URL');
      return;
    }

    const audio = audioRef.current;

    // Clear previous event listeners to avoid duplicates
    audio.oncanplay = null;
    audio.onerror = null;

    // Use proxy for HTTP streams when on HTTPS (Mixed Content fix)
    const finalStreamUrl = getProxiedStreamUrl(streamUrl);
    audio.src = finalStreamUrl;
    audio.load();

    // Wait for audio to be ready before playing
    audio.oncanplay = () => {
      audio.play().catch((error) => {
        logger.error('[Player] Failed to play radio:', error.message);
      });
      audio.oncanplay = null; // Clean up after playing
    };

    // Error handler for radio loading issues
    audio.onerror = () => {
      // Get detailed error information from MediaError
      const mediaError = audio.error;
      let errorMessage = 'Unknown error';
      let errorCode = 'UNKNOWN';

      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Playback aborted by user';
            errorCode = 'ABORTED';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error - stream may be offline or unreachable';
            errorCode = 'NETWORK';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Decoding error - stream format may not be supported';
            errorCode = 'DECODE';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Stream format not supported by browser';
            errorCode = 'FORMAT';
            break;
        }
      }

      logger.error(
        `[Player] Failed to load radio station: ${station.name}`,
        `Error: ${errorCode} - ${errorMessage}`,
        `Original URL: ${streamUrl}`,
        finalStreamUrl !== streamUrl ? `Proxied URL: ${finalStreamUrl}` : ''
      );
      audio.onerror = null;
    };

    // Update state to indicate radio is playing
    onRadioStateChange(station, true);
  }, [audioRef, onRadioStateChange]);

  /**
   * Stop radio playback
   */
  const stopRadio = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // Update state to clear radio
    onRadioStateChange(null, false);
  }, [audioRef, onRadioStateChange]);

  return {
    playRadio,
    stopRadio,
  };
}
