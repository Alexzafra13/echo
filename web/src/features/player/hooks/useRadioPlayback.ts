/**
 * useRadioPlayback Hook
 *
 * Handles radio station playback including:
 * - Stream URL handling (with HTTPS proxy for mixed content)
 * - Signal status monitoring
 * - Metadata integration
 */

import { useState, useCallback } from 'react';
import { logger } from '@shared/utils/logger';
import { getProxiedStreamUrl } from '../utils/streamProxy';
import type { AudioElements } from './useAudioElements';
import type { RadioStation, RadioMetadata, RadioBrowserStation } from '@shared/types';

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
      setState(prev => ({ ...prev, signalStatus: 'error' }));
      audio.onerror = null;
    };

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
  }, [audioElements]);

  /**
   * Stop radio playback
   */
  const stopRadio = useCallback(() => {
    audioElements.stopBoth();
    audioElements.resetToAudioA();

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
