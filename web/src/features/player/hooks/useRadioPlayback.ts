/**
 * useRadioPlayback Hook
 *
 * Handles radio station playback including:
 * - Stream URL handling (with HTTPS proxy for mixed content)
 * - Signal status monitoring
 * - Metadata integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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

export function useRadioPlayback({ audioElements }: UseRadioPlaybackParams) {
  const [state, setState] = useState<RadioState>({
    currentStation: null,
    isRadioMode: false,
    signalStatus: null,
    metadata: null,
  });
  // Ref síncrono para que stopRadio pueda leer isRadioMode sin esperar a React
  const isRadioModeRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(errorTimerRef.current), []);

  // Muestra estado de error brevemente y luego cierra el modo radio.
  // Compartido entre oncanplay retry fallido y onerror.
  const scheduleRadioErrorClose = useCallback(() => {
    setState((prev) => ({ ...prev, signalStatus: 'error' }));
    clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      isRadioModeRef.current = false;
      setState({
        currentStation: null,
        isRadioMode: false,
        signalStatus: null,
        metadata: null,
      });
    }, 2000);
  }, []);

  /**
   * Update radio metadata
   */
  const setMetadata = useCallback((metadata: RadioMetadata | null) => {
    setState((prev) => ({ ...prev, metadata }));
  }, []);

  /**
   * Update signal status
   */
  const setSignalStatus = useCallback((status: RadioSignalStatus) => {
    setState((prev) => {
      // Only update if in radio mode
      if (!prev.isRadioMode) return prev;
      return { ...prev, signalStatus: status };
    });
  }, []);

  /**
   * Play a radio station
   */
  const playRadio = useCallback(
    async (station: RadioStation | RadioBrowserStation) => {
      try {
        // Use url_resolved if available (better quality), fallback to url
        const streamUrl =
          'urlResolved' in station
            ? station.urlResolved
            : 'url_resolved' in station
              ? station.url_resolved
              : station.url;

        if (!streamUrl) {
          logger.error('[Radio] Station has no valid stream URL');
          return false;
        }

        // Stop any playing audio and reset to audio A for radio
        // IMPORTANT: Must await stopBoth() as it's async with fade-out
        // Not awaiting causes race condition where src is cleared after new stream loads
        await audioElements.stopBoth();
        audioElements.resetToAudioA();

        const audio = audioElements.getActiveAudio();
        if (!audio) {
          logger.error('[Radio] No active audio element');
          return false;
        }

        // Limpiar handlers y src previo. El src = '' es necesario para que el
        // browser trate el siguiente audio.src como una fuente nueva y emita canplay.
        // Sin esto, cambiar de un stream de música a uno de radio puede no
        // disparar canplay si el browser considera que el elemento ya está "cargado".
        audio.oncanplay = null;
        audio.onerror = null;
        audio.src = '';

        // Use proxy for HTTP streams when on HTTPS (Mixed Content fix)
        const finalStreamUrl = getProxiedStreamUrl(streamUrl);

        logger.debug('[Radio] Loading stream:', finalStreamUrl);
        audio.src = finalStreamUrl;
        audio.load();

        // Wait for audio to be ready before playing
        audio.oncanplay = () => {
          audio.play().catch((error) => {
            logger.warn('[Radio] Play failed, retrying:', error.message);
            audio.play().catch((retryError) => {
              logger.error('[Radio] Retry failed:', retryError.message);
              audio.src = '';
              scheduleRadioErrorClose();
            });
          });
          audio.oncanplay = null;
        };

        audio.onerror = () => {
          logger.error(
            '[Radio] Failed to load station:',
            'name' in station ? station.name : 'Unknown',
            'URL:',
            finalStreamUrl
          );
          audio.src = '';
          scheduleRadioErrorClose();
          audio.onerror = null;
        };

        // Normalize station to RadioStation type
        const normalizedStation: RadioStation =
          'stationuuid' in station
            ? {
                stationUuid: station.stationuuid,
                name: station.name,
                url: station.url,
                urlResolved: station.url_resolved,
                homepage: station.homepage,
                favicon: station.favicon,
                customFaviconUrl: station.customFaviconUrl,
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

        isRadioModeRef.current = true;
        setState({
          currentStation: normalizedStation,
          isRadioMode: true,
          signalStatus: 'good',
          metadata: null,
        });

        logger.debug('[Radio] Playing station:', normalizedStation.name);
        return true;
      } catch (error) {
        logger.error('[Radio] Unexpected error playing station:', (error as Error).message);
        isRadioModeRef.current = false;
        setState({
          currentStation: null,
          isRadioMode: false,
          signalStatus: 'error',
          metadata: null,
        });
        return false;
      }
    },
    [audioElements, scheduleRadioErrorClose]
  );

  /**
   * Stop radio playback
   * Note: This is async because stopBoth() needs to fade out audio first
   */
  const stopRadio = useCallback(async () => {
    // Solo parar audio si realmente estábamos en modo radio (ref síncrono).
    // Sin este guard, llamadas duplicadas a stopRadio() (desde playQueue + playTrack)
    // ejecutan stopBoth() cuando el nuevo track ya está cargado, matando la reproducción.
    if (isRadioModeRef.current) {
      isRadioModeRef.current = false;
      try {
        await audioElements.stopBoth();
        audioElements.resetToAudioA();
      } catch (error) {
        logger.error('[Radio] Error during stop:', (error as Error).message);
      }
    }

    setState({
      currentStation: null,
      isRadioMode: false,
      signalStatus: null,
      metadata: null,
    });

    logger.debug('[Radio] Stopped playback');
  }, [audioElements]);

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
