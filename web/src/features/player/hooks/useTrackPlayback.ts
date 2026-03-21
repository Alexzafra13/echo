/**
 * Reproducción de una pista: construye URL de stream, carga el audio,
 * decide si usar crossfade o reproducción normal, y reintenta en caso de error.
 */

import { useCallback } from 'react';
import { Track } from '../types';
import { useStreamToken } from './useStreamToken';
import { logger } from '@shared/utils/logger';
import { playActiveWithRetry } from './playActiveWithRetry';
import type { AudioElements } from './useAudioElements';
import type { CrossfadeLogic } from './useCrossfadeLogic';
import type { PlayTracking } from './usePlayTracking';
import type { RadioPlayback } from './useRadioPlayback';
import type { CrossfadeSettings } from '../types';
import type { PlayerSharedRefs } from './playerSharedRefs';

export interface UseTrackPlaybackParams {
  audioElements: AudioElements;
  crossfade: CrossfadeLogic;
  crossfadeSettings: CrossfadeSettings;
  playTracking: PlayTracking;
  radio: RadioPlayback;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  sharedRefs: PlayerSharedRefs;
}

export function useTrackPlayback({
  audioElements,
  crossfade,
  crossfadeSettings,
  playTracking,
  radio,
  isPlaying,
  setIsPlaying,
  setCurrentTrack,
  sharedRefs,
}: UseTrackPlaybackParams) {
  const { isTransitioningRef, preloadedNextRef, queueContextRef } = sharedRefs;
  const { data: streamTokenData, ensureToken } = useStreamToken();

  /**
   * Build stream URL for a track.
   * Uses custom streamUrl if available (for federated/remote tracks).
   */
  const getStreamUrl = useCallback(
    async (track: Track): Promise<string | null> => {
      let token: string | null = streamTokenData?.token ?? null;

      if (!token) {
        logger.debug('[Player] Token not in cache, waiting for it...');
        token = await ensureToken();
      }

      if (!token) {
        logger.error('[Player] Stream token not available after waiting');
        return null;
      }

      if (track.streamUrl) {
        const separator = track.streamUrl.includes('?') ? '&' : '?';
        return `${track.streamUrl}${separator}token=${token}`;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      return `${API_BASE_URL}/tracks/${track.id}/stream?token=${token}`;
    },
    [streamTokenData?.token, ensureToken]
  );

  /**
   * Play a track with crossfade (both audios playing simultaneously).
   * Handles preloaded path (instant) and non-preloaded path (loads on the fly).
   * Falls back to normal playback if crossfade fails (e.g. mobile autoplay policy).
   */
  const playCrossfadeTrack = useCallback(
    async (track: Track, streamUrl: string) => {
      // Crossfade manages its own transition state via isCrossfadingRef
      isTransitioningRef.current = false;

      // Reuse preloaded audio if available, otherwise load now
      const preloaded = preloadedNextRef.current;
      if (preloaded && preloaded.trackId === track.id) {
        preloadedNextRef.current = null;
        logger.debug('[Player] Crossfade using preloaded audio:', track.title);
      } else {
        crossfade.prepareCrossfade(streamUrl);
        logger.debug('[Player] Starting crossfade to:', track.title);
      }

      setCurrentTrack(track);

      const crossfadeStarted = await crossfade.performCrossfade();

      if (!crossfadeStarted) {
        // Crossfade failed — fall back to normal playback
        logger.warn('[Player] Crossfade failed on mobile, falling back to normal playback');
        isTransitioningRef.current = true;
        audioElements.stopInactive();
        audioElements.loadOnActive(streamUrl);

        try {
          await playActiveWithRetry(audioElements, true);
        } finally {
          isTransitioningRef.current = false;
          if (audioElements.getActiveAudio()?.paused) {
            setIsPlaying(false);
          }
        }
      }

      playTracking.startPlaySession(track, queueContextRef.current);
    },
    // Refs are stable — only include callback/object deps
    [audioElements, crossfade, playTracking, setCurrentTrack, setIsPlaying]
  );

  /**
   * Play a track normally (no crossfade).
   * Tries immediate play first; retries with buffer wait on failure.
   */
  const playNormalTrack = useCallback(
    async (track: Track, streamUrl: string) => {
      // isTransitioningRef is already true from playTrack
      crossfade.clearCrossfade();
      audioElements.stopInactive();
      audioElements.loadOnActive(streamUrl);

      setCurrentTrack(track);
      playTracking.startPlaySession(track, queueContextRef.current);

      try {
        await playActiveWithRetry(audioElements, false);
      } finally {
        isTransitioningRef.current = false;
        if (audioElements.getActiveAudio()?.paused) {
          setIsPlaying(false);
        }
      }
    },
    [audioElements, crossfade, playTracking, setCurrentTrack, setIsPlaying]
  );

  /**
   * Play a track with optional crossfade.
   * Handles stream URL resolution, radio exit, and routing to the
   * appropriate playback path (crossfade vs normal).
   */
  const playTrack = useCallback(
    async (track: Track, withCrossfade: boolean = false) => {
      // Suppress pause events during async getStreamUrl
      isTransitioningRef.current = true;

      const streamUrl = await getStreamUrl(track);
      if (!streamUrl) {
        logger.warn('[Player] Cannot play track: stream URL unavailable');
        isTransitioningRef.current = false;
        crossfade.clearCrossfade();
        return;
      }

      if (radio.isRadioMode) {
        await radio.stopRadio();
      }

      // Use isCrossfadingRef as synchronous guard: if onCrossfadeTrigger already
      // set it, we MUST take the crossfade path even if isPlaying is stale.
      const shouldCrossfade =
        withCrossfade &&
        crossfadeSettings.enabled &&
        (isPlaying || crossfade.isCrossfadingRef.current);

      if (shouldCrossfade) {
        await playCrossfadeTrack(track, streamUrl);
      } else {
        await playNormalTrack(track, streamUrl);
      }
    },
    [
      getStreamUrl,
      radio,
      crossfadeSettings.enabled,
      isPlaying,
      crossfade,
      playCrossfadeTrack,
      playNormalTrack,
    ]
  );

  return {
    playTrack,
    getStreamUrl,
  };
}

export type TrackPlayback = ReturnType<typeof useTrackPlayback>;
