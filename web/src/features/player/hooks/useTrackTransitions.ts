/**
 * useTrackTransitions Hook
 *
 * Handles automatic track-to-track transitions:
 * - Track ended handler (repeat, preloaded, fallback paths)
 * - Gapless preloading (buffers next track 15s before end)
 * - Autoplay triggering when queue is exhausted
 *
 * Extracted from PlayerContext to isolate the complex transition
 * logic from state management and queue coordination.
 */

import { useEffect } from 'react';
import { useLatestCallback } from '@shared/hooks';
import { Track } from '../types';
import { logger } from '@shared/utils/logger';
import { playActiveWithRetry } from './playActiveWithRetry';
import type { AudioElements } from './useAudioElements';
import type { CrossfadeLogic } from './useCrossfadeLogic';
import type { PlayTracking } from './usePlayTracking';
import type { QueueManagement } from './useQueueManagement';
import type { AutoplaySettings } from '../types';
import type { PlayerSharedRefs } from './playerSharedRefs';

export interface UseTrackTransitionsParams {
  audioElements: AudioElements;
  crossfade: CrossfadeLogic;
  playTracking: PlayTracking;
  queue: QueueManagement;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrack: (track: Track | null) => void;
  currentTrack: Track | null;
  userVolume: number;
  autoplaySettings: AutoplaySettings;
  sharedRefs: PlayerSharedRefs;
  radio: { isRadioMode: boolean };
  // Callbacks injected from PlayerContext (avoid circular deps)
  handlePlayNext: (useCrossfade: boolean) => Promise<void>;
  getStreamUrl: (track: Track) => Promise<string | null>;
}

export function useTrackTransitions({
  audioElements,
  crossfade,
  playTracking,
  queue,
  isPlaying,
  setIsPlaying,
  setCurrentTrack,
  currentTrack,
  userVolume,
  autoplaySettings,
  sharedRefs,
  radio,
  handlePlayNext,
  getStreamUrl,
}: UseTrackTransitionsParams) {
  const { isTransitioningRef, preloadedNextRef, queueContextRef } = sharedRefs;
  /**
   * Play next track using preloaded audio if available, otherwise fall back
   * to the standard handlePlayNext path.
   * Defined before handleEnded so it's available in handleEnded's closure.
   */
  const playNextWithPreload = useLatestCallback(async () => {
    // Web Audio API enables crossfade on all platforms (including iOS).
    // Audio B's play() works because it was authorized during previous playback.
    const preloaded = preloadedNextRef.current;
    const nextIndex = queue.getNextIndex();
    const nextTrack = nextIndex !== -1 ? queue.getTrackAt(nextIndex) : null;

    if (nextTrack && preloaded && preloaded.trackId === nextTrack.id) {
      logger.debug('[Player] Preloaded transition to:', nextTrack.title);
      isTransitioningRef.current = true;
      preloadedNextRef.current = null;

      queue.setCurrentIndex(nextIndex);
      setCurrentTrack(nextTrack);
      audioElements.switchActiveAudio();

      // Restore user volume on the new active element
      const newActiveId = audioElements.getActiveAudioId();
      audioElements.setAudioVolume(newActiveId, userVolume);

      try {
        await playActiveWithRetry(audioElements, false);
      } catch {
        // playActiveWithRetry already logs errors
      }

      audioElements.stopInactive();
      isTransitioningRef.current = false;

      if (audioElements.getActiveAudio()?.paused) {
        setIsPlaying(false);
      }
      playTracking.startPlaySession(nextTrack, queueContextRef.current);
    } else {
      logger.debug('[Player] Playing next track in queue');
      await handlePlayNext(false);
    }
  });

  // ========== TRACK ENDED HANDLER ==========
  // useLatestCallback ensures the onEnded callback (registered once in
  // useAudioElements) always delegates to the latest state without
  // needing to remove/re-add DOM listeners.
  const handleEnded = useLatestCallback(async () => {
    try {
      // Skip if crossfade is managing the transition (synchronous ref check)
      if (crossfade.isCrossfadingRef.current) return;

      playTracking.endPlaySession(false);

      const hasNextTrack = queue.hasNext();

      logger.debug('[Player] Track ended - checking next action', {
        repeatMode: queue.repeatMode,
        hasNext: hasNextTrack,
        currentIndex: queue.currentIndex,
        queueLength: queue.queue.length,
        autoplayEnabled: autoplaySettings.enabled,
        artistId: currentTrack?.artistId || 'MISSING',
        isRadioMode: radio.isRadioMode,
      });

      if (queue.repeatMode === 'one') {
        logger.debug('[Player] Repeat one - replaying current track');
        audioElements.playActive();
      } else if (hasNextTrack) {
        await playNextWithPreload();
      } else {
        // Queue exhausted — handlePlayNext will try autoplay
        logger.debug('[Player] No more tracks - trying autoplay');
        await handlePlayNext(false);
      }
    } catch (error) {
      logger.error(
        '[Player] Error in ended handler, attempting recovery:',
        (error as Error).message
      );
      try {
        await handlePlayNext(false);
      } catch (recoveryError) {
        logger.error('[Player] Recovery failed:', (recoveryError as Error).message);
        setIsPlaying(false);
      }
    }
  });

  // ========== GAPLESS PRELOAD ==========
  // Preloads the next track 15s before end on the inactive audio element.
  const checkGaplessPreload = useLatestCallback(() => {
    // Skip during crossfade — the inactive audio element is currently being
    // used for the crossfade transition. Loading a new track on it would
    // overwrite the src and reset the gain to 0, killing the crossfade audio.
    if (crossfade.isCrossfadingRef.current) return;

    // Skip in radio mode or when not playing
    if (radio.isRadioMode || !isPlaying) return;

    const audio = audioElements.getActiveAudio();
    if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;

    const timeRemaining = audio.duration - audio.currentTime;
    if (timeRemaining <= 0) return;

    if (timeRemaining <= 15 && !preloadedNextRef.current) {
      if (queue.repeatMode === 'one') return;
      const nextIndex = queue.getNextIndex();
      if (nextIndex === -1) return;
      const nextTrack = queue.getTrackAt(nextIndex);
      if (!nextTrack) return;

      getStreamUrl(nextTrack).then((url) => {
        if (!url || preloadedNextRef.current || crossfade.isCrossfadingRef.current) return;
        preloadedNextRef.current = {
          trackId: nextTrack.id,
          nextIndex,
          track: nextTrack,
        };
        audioElements.loadOnInactive(url);
        logger.debug('[Player] Gapless: preloaded next track:', nextTrack.title);
      });
    }
  });

  // Stable timeupdate listener for gapless preloading
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handleTimeUpdate = () => checkGaplessPreload();

    audioA.addEventListener('timeupdate', handleTimeUpdate);
    audioB.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioA.removeEventListener('timeupdate', handleTimeUpdate);
      audioB.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioElements.audioRefA, audioElements.audioRefB, checkGaplessPreload]);

  // Clear preload when track changes
  useEffect(() => {
    preloadedNextRef.current = null;
  }, [currentTrack, preloadedNextRef]);

  return {
    /** Stable reference — safe to call from useAudioElements onEnded */
    handleEnded,
  };
}
