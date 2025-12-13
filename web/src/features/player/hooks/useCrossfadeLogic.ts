/**
 * useCrossfadeLogic Hook
 *
 * Handles crossfade transitions between tracks including:
 * - Volume ramping (fade in/out)
 * - Timing detection for when to start crossfade
 * - Managing dual audio element transitions
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { logger } from '@shared/utils/logger';
import type { AudioElements } from './useAudioElements';
import type { CrossfadeSettings } from '../types';

interface UseCrossfadeLogicParams {
  audioElements: AudioElements;
  settings: CrossfadeSettings;
  isRadioMode: boolean;
  repeatMode: 'off' | 'all' | 'one';
  hasNextTrack: boolean;
  onCrossfadeStart?: () => void;
  onCrossfadeComplete?: () => void;
  onCrossfadeTrigger?: () => void; // Called when it's time to start crossfade to next track
}

const FADE_STEPS = 50; // Number of volume steps for smooth transition

export function useCrossfadeLogic({
  audioElements,
  settings,
  isRadioMode,
  repeatMode,
  hasNextTrack,
  onCrossfadeStart,
  onCrossfadeComplete,
  onCrossfadeTrigger,
}: UseCrossfadeLogicParams) {
  const [isCrossfading, setIsCrossfading] = useState(false);
  const crossfadeIntervalRef = useRef<number | null>(null);
  const crossfadeTimeoutRef = useRef<number | null>(null);
  const crossfadeStartedRef = useRef(false);

  // Store callbacks in ref to avoid stale closures
  const callbacksRef = useRef({ onCrossfadeStart, onCrossfadeComplete, onCrossfadeTrigger });
  callbacksRef.current = { onCrossfadeStart, onCrossfadeComplete, onCrossfadeTrigger };

  /**
   * Clear any ongoing crossfade timers
   */
  const clearCrossfade = useCallback(() => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    setIsCrossfading(false);
  }, []);

  /**
   * Reset crossfade started flag (call when track changes)
   */
  const resetCrossfadeFlag = useCallback(() => {
    crossfadeStartedRef.current = false;
  }, []);

  /**
   * Perform crossfade transition
   * Fades out active audio while fading in inactive audio
   */
  const performCrossfade = useCallback(async () => {
    const activeAudio = audioElements.getActiveAudio();
    const inactiveAudio = audioElements.getInactiveAudio();
    const targetVolume = audioElements.volume;

    if (!activeAudio || !inactiveAudio) {
      logger.error('[Crossfade] Audio elements not available');
      return false;
    }

    logger.debug('[Crossfade] Starting crossfade transition');
    setIsCrossfading(true);
    callbacksRef.current.onCrossfadeStart?.();

    try {
      // Start playing the inactive audio (should already have src loaded)
      await audioElements.playInactive();

      const fadeDuration = settings.duration * 1000; // Convert to ms
      const fadeInterval = fadeDuration / FADE_STEPS;
      const volumeStep = targetVolume / FADE_STEPS;

      let currentStep = 0;
      const activeId = audioElements.getActiveAudioId();
      const inactiveId = activeId === 'A' ? 'B' : 'A';

      crossfadeIntervalRef.current = window.setInterval(() => {
        currentStep++;

        // Fade out active, fade in inactive
        const fadeOutVolume = Math.max(0, targetVolume - (volumeStep * currentStep));
        const fadeInVolume = Math.min(targetVolume, volumeStep * currentStep);

        audioElements.setAudioVolume(activeId, fadeOutVolume);
        audioElements.setAudioVolume(inactiveId, fadeInVolume);

        if (currentStep >= FADE_STEPS) {
          // Crossfade complete
          clearCrossfade();

          // Stop the old audio
          audioElements.stopActive();

          // Switch active audio
          audioElements.switchActiveAudio();

          logger.debug('[Crossfade] Crossfade complete, switched to:', audioElements.getActiveAudioId());
          callbacksRef.current.onCrossfadeComplete?.();
        }
      }, fadeInterval);

      return true;
    } catch (error) {
      logger.error('[Crossfade] Failed to perform crossfade:', (error as Error).message);
      clearCrossfade();
      return false;
    }
  }, [audioElements, settings.duration, clearCrossfade]);

  /**
   * Prepare inactive audio for crossfade
   */
  const prepareCrossfade = useCallback((streamUrl: string) => {
    audioElements.loadOnInactive(streamUrl);
    logger.debug('[Crossfade] Prepared next track for crossfade');
  }, [audioElements]);

  /**
   * Check if crossfade should be triggered based on timing
   * Returns true if crossfade should start
   */
  const checkCrossfadeTiming = useCallback((): boolean => {
    // Skip if crossfade is disabled, already crossfading, in radio mode, or repeat one
    if (!settings.enabled || isCrossfading || isRadioMode || repeatMode === 'one') {
      return false;
    }

    // Check if there's a next track to play
    if (!hasNextTrack) {
      return false;
    }

    const duration = audioElements.getDuration();
    const currentTime = audioElements.getCurrentTime();
    const timeRemaining = duration - currentTime;
    const crossfadeDuration = settings.duration;

    // Start crossfade when time remaining equals crossfade duration
    // Only if we haven't already started it for this track
    // And track is long enough
    if (
      timeRemaining <= crossfadeDuration &&
      timeRemaining > 0 &&
      !crossfadeStartedRef.current &&
      duration > crossfadeDuration
    ) {
      crossfadeStartedRef.current = true;
      return true;
    }

    return false;
  }, [settings, isCrossfading, isRadioMode, repeatMode, hasNextTrack, audioElements]);

  /**
   * Effect to listen for timeupdate and trigger crossfade
   */
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handleTimeUpdate = () => {
      if (checkCrossfadeTiming()) {
        logger.debug('[Crossfade] Triggering crossfade to next track');
        callbacksRef.current.onCrossfadeTrigger?.();
      }
    };

    // Note: Don't reset crossfadeStartedRef here - it should only be reset
    // when a new track starts playing (via resetCrossfadeFlag)

    audioA.addEventListener('timeupdate', handleTimeUpdate);
    audioB.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audioA.removeEventListener('timeupdate', handleTimeUpdate);
      audioB.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioElements, checkCrossfadeTiming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCrossfade();
    };
  }, [clearCrossfade]);

  return {
    // State
    isCrossfading,

    // Actions
    performCrossfade,
    prepareCrossfade,
    clearCrossfade,
    resetCrossfadeFlag,

    // Checks
    checkCrossfadeTiming,

    // Settings passthrough for convenience
    isEnabled: settings.enabled,
    duration: settings.duration,
  };
}

export type CrossfadeLogic = ReturnType<typeof useCrossfadeLogic>;
