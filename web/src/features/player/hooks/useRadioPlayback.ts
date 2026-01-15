/**
 * useRadioPlayback Hook
 *
 * Handles radio station playback including:
 * - Stream URL handling (with HTTPS proxy for mixed content)
 * - HLS stream support via HLS.js (for .m3u8 streams in Chrome/Firefox)
 * - Signal status monitoring
 * - Metadata integration
 */

import { useState, useCallback, useRef } from 'react';
import Hls from 'hls.js';
import { logger } from '@shared/utils/logger';
import { getProxiedStreamUrl } from '../utils/streamProxy';
import type { AudioElements } from './useAudioElements';
import type { RadioStation, RadioMetadata, RadioBrowserStation } from '@shared/types/radio.types';

export type RadioSignalStatus = 'good' | 'weak' | 'error' | null;

interface RadioState {
  currentStation: RadioStation | null;
  isRadioMode: boolean;
  signalStatus: RadioSignalStatus;
  metadata: RadioMetadata | null;
}

interface UseRadioPlaybackParams {
  audioElements: AudioElements;
}

/**
 * Helper to detect if a URL is an HLS stream
 */
function isHlsStream(url: string): boolean {
  return url.includes('.m3u8') || url.includes('m3u8');
}

/**
 * Helper to check if browser supports native HLS playback (Safari/iOS)
 */
function supportsNativeHls(): boolean {
  const audio = document.createElement('audio');
  return audio.canPlayType('application/vnd.apple.mpegurl') !== '';
}

export function useRadioPlayback({ audioElements }: UseRadioPlaybackParams) {
  const [state, setState] = useState<RadioState>({
    currentStation: null,
    isRadioMode: false,
    signalStatus: null,
    metadata: null,
  });

  // HLS.js instance for handling .m3u8 streams
  const hlsRef = useRef<Hls | null>(null);

  /**
   * Cleanup HLS instance
   */
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      logger.debug('[Radio] HLS instance destroyed');
    }
  }, []);

  /**
   * Update radio metadata
   */
  const setMetadata = useCallback((metadata: RadioMetadata | null) => {
    setState(prev => ({ ...prev, metadata }));
  }, []);

  /**
   * Update signal status
   */
  const setSignalStatus = useCallback((status: RadioSignalStatus) => {
    setState(prev => {
      // Only update if in radio mode
      if (!prev.isRadioMode) return prev;
      return { ...prev, signalStatus: status };
    });
  }, []);

  /**
   * Play a radio station
   */
  const playRadio = useCallback((station: RadioStation | RadioBrowserStation) => {
    // Use url_resolved if available (better quality), fallback to url
    const streamUrl = 'urlResolved' in station
      ? station.urlResolved
      : 'url_resolved' in station
        ? station.url_resolved
        : station.url;

    if (!streamUrl) {
      logger.error('[Radio] Station has no valid stream URL');
      return false;
    }

    // Cleanup any existing HLS instance
    cleanupHls();

    // Stop any playing audio and reset to audio A for radio
    audioElements.stopBoth();
    audioElements.resetToAudioA();

    const audio = audioElements.getActiveAudio();
    if (!audio) {
      logger.error('[Radio] No active audio element');
      return false;
    }

    // Clear previous event listeners to avoid duplicates
    audio.oncanplay = null;
    audio.onerror = null;

    // Use proxy for HTTP streams when on HTTPS (Mixed Content fix)
    const finalStreamUrl = getProxiedStreamUrl(streamUrl);

    // Check if this is an HLS stream and browser needs HLS.js
    const needsHls = isHlsStream(finalStreamUrl) && !supportsNativeHls();

    if (needsHls && Hls.isSupported()) {
      // Use HLS.js for .m3u8 streams in Chrome/Firefox
      logger.debug('[Radio] Using HLS.js for stream:', finalStreamUrl);

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        debug: false,
      });
      hlsRef.current = hls;

      hls.loadSource(finalStreamUrl);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch((error) => {
          logger.error('[Radio] Failed to play HLS:', error.message);
          setState(prev => ({ ...prev, signalStatus: 'error' }));
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          logger.error('[Radio] HLS fatal error:', data.type, data.details);

          // Try to recover from fatal errors
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            // Unrecoverable error - exit radio mode completely
            cleanupHls();
            setState({
              currentStation: null,
              isRadioMode: false,
              signalStatus: 'error',
              metadata: null,
            });
          }
        }
      });
    } else {
      // Use native audio for non-HLS streams or Safari (which supports HLS natively)
      logger.debug('[Radio] Using native audio for stream:', finalStreamUrl);

      audio.src = finalStreamUrl;
      audio.load();

      // Wait for audio to be ready before playing
      audio.oncanplay = () => {
        audio.play().catch((error) => {
          logger.error('[Radio] Failed to play:', error.message);
          setState(prev => ({ ...prev, signalStatus: 'error' }));
        });
        audio.oncanplay = null;
      };

      // Error handler for radio loading issues
      audio.onerror = () => {
        logger.error('[Radio] Failed to load station:',
          'name' in station ? station.name : 'Unknown',
          'URL:', finalStreamUrl
        );
        // Clear the broken source to prevent blocking future playback
        audio.src = '';
        // Exit radio mode completely on load failure
        setState({
          currentStation: null,
          isRadioMode: false,
          signalStatus: 'error',
          metadata: null,
        });
        audio.onerror = null;
      };
    }

    // Normalize station to RadioStation type
    const normalizedStation: RadioStation = 'stationuuid' in station
      ? {
          stationUuid: station.stationuuid,
          name: station.name,
          url: station.url,
          urlResolved: station.url_resolved,
          homepage: station.homepage,
          favicon: station.favicon,
          country: station.country,
          countryCode: station.countrycode,
          state: station.state,
          language: station.language,
          tags: station.tags,
          codec: station.codec,
          bitrate: station.bitrate,
          votes: station.votes,
          clickCount: station.clickcount,
          lastCheckOk: station.lastcheckok === 1,
        }
      : station;

    setState({
      currentStation: normalizedStation,
      isRadioMode: true,
      signalStatus: 'good',
      metadata: null,
    });

    logger.debug('[Radio] Playing station:', normalizedStation.name);
    return true;
  }, [audioElements, cleanupHls]);

  /**
   * Stop radio playback
   * Note: This is async because stopBoth() needs to fade out audio first
   */
  const stopRadio = useCallback(async () => {
    // Cleanup HLS instance if active
    cleanupHls();

    // Wait for stopBoth to complete (includes fade-out) before returning
    // This prevents race conditions where new audio is loaded before old is cleared
    await audioElements.stopBoth();
    audioElements.resetToAudioA();

    setState({
      currentStation: null,
      isRadioMode: false,
      signalStatus: null,
      metadata: null,
    });

    logger.debug('[Radio] Stopped playback');
  }, [audioElements, cleanupHls]);

  /**
   * Resume radio playback (if paused)
   */
  const resumeRadio = useCallback(async () => {
    if (!state.isRadioMode || !state.currentStation) {
      return false;
    }

    try {
      await audioElements.playActive();
      return true;
    } catch (error) {
      logger.error('[Radio] Failed to resume:', (error as Error).message);
      return false;
    }
  }, [audioElements, state.isRadioMode, state.currentStation]);

  /**
   * Pause radio playback
   */
  const pauseRadio = useCallback(() => {
    if (!state.isRadioMode) return;
    audioElements.pauseActive();
  }, [audioElements, state.isRadioMode]);

  return {
    // State
    currentStation: state.currentStation,
    isRadioMode: state.isRadioMode,
    signalStatus: state.signalStatus,
    metadata: state.metadata,

    // Actions
    playRadio,
    stopRadio,
    resumeRadio,
    pauseRadio,
    setMetadata,
    setSignalStatus,
  };
}

export type RadioPlayback = ReturnType<typeof useRadioPlayback>;
