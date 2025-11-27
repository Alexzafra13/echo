/**
 * useRadioPlayer Hook
 *
 * Manages radio station playback functionality.
 * Handles radio-specific streaming logic and error handling.
 */

import { useCallback } from 'react';
import { logger } from '@shared/utils/logger';
import type { RadioStation, RadioBrowserStation } from '@shared/types/radio.types';

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

    audio.src = streamUrl;
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
      logger.error('[Player] Failed to load radio station:', station.name);
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
