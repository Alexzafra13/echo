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
  currentTrackOutroStart?: number; // Smart crossfade: track's detected outro start time
  onCrossfadeStart?: () => void;
  onCrossfadeComplete?: () => void;
  onCrossfadeTrigger?: () => void; // Called when it's time to start crossfade to next track
  onCrossfadeCleared?: () => void; // Called whenever crossfade state is cleared (completion, cancel, error)
  // LUFS normalization support
  getEffectiveVolume?: (audioId: 'A' | 'B') => number;
  onCrossfadeSwapGains?: () => void; // Called after audio switch to swap gains
  // Platform capability: false on iOS Safari where audio.volume is read-only
  volumeControlSupported?: boolean;
}

/**
 * Apply equal-power crossfade curve for smoother audio transitions.
 * Uses cosine/sine curves to maintain constant perceived loudness.
 * This prevents the "dip" in volume that occurs with linear crossfades.
 */
function equalPowerFade(progress: number): { fadeOut: number; fadeIn: number } {
  // Clamp progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));
  // Equal power crossfade: use cos/sin for smooth transition
  // This maintains constant power (loudness) throughout the fade
  const fadeOut = Math.cos(p * Math.PI * 0.5);
  const fadeIn = Math.sin(p * Math.PI * 0.5);
  return { fadeOut, fadeIn };
}

export function useCrossfadeLogic({
  audioElements,
  settings,
  isRadioMode,
  repeatMode,
  hasNextTrack,
  currentTrackOutroStart,
  onCrossfadeStart,
  onCrossfadeComplete,
  onCrossfadeTrigger,
  onCrossfadeCleared,
  getEffectiveVolume,
  onCrossfadeSwapGains,
  volumeControlSupported = true,
}: UseCrossfadeLogicParams) {
  const [isCrossfading, setIsCrossfading] = useState(false);
  // Synchronous ref mirrors isCrossfading state to prevent race conditions.
  // React state updates are async (batched), so between setIsCrossfading(true) and the
  // next render, timeupdate events can fire and re-trigger checkCrossfadeTiming with
  // the stale isCrossfading=false closure. This ref provides an immediate, synchronous
  // guard that prevents double-crossfade triggers.
  const isCrossfadingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const crossfadeTimeoutRef = useRef<number | null>(null);
  const crossfadeStartedRef = useRef(false);
  const crossfadeStartTimeRef = useRef<number | null>(null);

  // Store callbacks in ref to avoid stale closures
  const callbacksRef = useRef({ onCrossfadeStart, onCrossfadeComplete, onCrossfadeTrigger, onCrossfadeSwapGains, onCrossfadeCleared });
  callbacksRef.current = { onCrossfadeStart, onCrossfadeComplete, onCrossfadeTrigger, onCrossfadeSwapGains, onCrossfadeCleared };

  // Store getEffectiveVolume in ref to avoid stale closures
  const getEffectiveVolumeRef = useRef(getEffectiveVolume);
  getEffectiveVolumeRef.current = getEffectiveVolume;

  // Store volumeControlSupported in ref (same reason as settings - avoid callback cascade)
  const volumeControlSupportedRef = useRef(volumeControlSupported);
  volumeControlSupportedRef.current = volumeControlSupported;

  // Store settings in ref to avoid recreating performCrossfade/checkCrossfadeTiming
  // when settings change. This prevents a cascade of useCallback recreations:
  // settings change → performCrossfade recreated → crossfade object new ref →
  // playTrack recreated → handlePlayNext recreated → playNextRef updated (async).
  // During that async gap, stale closures can cause the crossfade path to be
  // skipped in playTrack, calling clearCrossfade() while both audios are playing.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /**
   * Clear any ongoing crossfade animation
   */
  const clearCrossfade = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }
    crossfadeStartTimeRef.current = null;
    // Reset both refs: allow next crossfade timing check to trigger for the new track,
    // and mark crossfade as no longer in progress (synchronously, before React re-renders)
    crossfadeStartedRef.current = false;
    isCrossfadingRef.current = false;
    setIsCrossfading(false);
    // Notify listeners (e.g. normalization) that crossfade is no longer active,
    // so they can resume normal volume management.
    callbacksRef.current.onCrossfadeCleared?.();
  }, []);

  /**
   * Reset crossfade started flag (call when track changes)
   */
  const resetCrossfadeFlag = useCallback(() => {
    crossfadeStartedRef.current = false;
  }, []);

  /**
   * Perform crossfade transition using requestAnimationFrame
   * Uses equal-power curve for smooth audio transitions without crackling
   * Supports LUFS normalization and optional tempo matching (DJ-style BPM sync)
   *
   * @param currentBpm - BPM of the currently playing (outgoing) track
   * @param nextBpm - BPM of the incoming track
   */
  const performCrossfade = useCallback(async (currentBpm?: number, nextBpm?: number) => {
    // If a crossfade animation is already running, cancel it first to prevent
    // two animation loops fighting over the same audio volumes.
    // Check crossfadeStartTimeRef (set when animation actually starts) instead of
    // isCrossfadingRef (set early by onCrossfadeTrigger before performCrossfade is called).
    if (crossfadeStartTimeRef.current !== null) {
      logger.warn('[Crossfade] Already crossfading, cancelling previous');
      clearCrossfade();
    }

    const activeAudio = audioElements.getActiveAudio();
    const inactiveAudio = audioElements.getInactiveAudio();
    const activeId = audioElements.getActiveAudioId();
    const inactiveId = activeId === 'A' ? 'B' : 'A';

    if (!activeAudio || !inactiveAudio) {
      logger.error('[Crossfade] Audio elements not available');
      return false;
    }

    // Read settings from ref to always use the latest values without
    // needing settings in the useCallback dependency array.
    const currentSettings = settingsRef.current;

    // Get effective volumes for each audio (includes their respective LUFS gains)
    // If getEffectiveVolume is provided, use separate volumes; otherwise fallback to single volume
    const getVolumeForAudio = getEffectiveVolumeRef.current;
    const activeTargetVolume = getVolumeForAudio ? getVolumeForAudio(activeId) : audioElements.volume;
    const inactiveTargetVolume = getVolumeForAudio ? getVolumeForAudio(inactiveId) : audioElements.volume;

    logger.debug('[Crossfade] Starting crossfade transition', {
      activeId,
      inactiveId,
      activeVolume: activeTargetVolume,
      inactiveVolume: inactiveTargetVolume,
    });
    // Set ref synchronously BEFORE React state to prevent race conditions.
    // timeupdate events can fire between setIsCrossfading and the next render,
    // and checkCrossfadeTiming needs to see the updated value immediately.
    isCrossfadingRef.current = true;
    setIsCrossfading(true);
    callbacksRef.current.onCrossfadeStart?.();

    try {
      // Start playing the inactive audio (should already have src loaded)
      // On mobile, playInactive() can fail due to autoplay policy. Retry once.
      try {
        await audioElements.playInactive();
      } catch (playError) {
        logger.warn('[Crossfade] playInactive failed, retrying:', (playError as Error).message);
        await audioElements.playInactive(false);
      }

      // On iOS Safari, audio.volume is read-only (always 1.0, hardware-controlled).
      // Volume-based crossfade is impossible — do a gapless-style transition:
      // both tracks play simultaneously for a brief overlap, then the old track
      // is paused. The overlap is kept short (max ~2s) to minimize the "double
      // audio" effect where both songs blast at full volume. The trigger timing
      // in checkCrossfadeTiming already compensates by firing closer to track end.
      //
      // With smart mode + outroStart, the transition fires when the song naturally
      // fades, so even a brief overlap sounds clean since the outgoing audio is
      // already at low volume.
      //
      // NOTE: For a future native mobile app, full volume-based crossfade
      // with equal-power curves should be used (native audio APIs support
      // programmatic volume control). The desktop web path below already
      // implements the complete crossfade logic that the app can mirror.
      if (!volumeControlSupportedRef.current) {
        const activeDur = activeAudio.duration;
        const activeTime = activeAudio.currentTime;
        const trackRemainingMs = (!isNaN(activeDur) && activeDur > activeTime)
          ? (activeDur - activeTime) * 1000
          : 2000;
        // Short overlap: 500ms minimum prevents audible gap, 2000ms max avoids
        // extended period of both tracks at full volume.
        const overlapDuration = Math.max(500, Math.min(2000, trackRemainingMs));

        logger.debug('[Crossfade] Gapless transition (volume control not supported)', {
          overlapDuration,
          trackRemainingMs,
        });

        crossfadeStartTimeRef.current = performance.now();

        // Let both tracks play together briefly, then finish
        crossfadeTimeoutRef.current = window.setTimeout(() => {
          if (crossfadeStartTimeRef.current === null) return;

          // Pause old audio
          activeAudio.playbackRate = 1;
          activeAudio.pause();
          activeAudio.currentTime = 0;

          // Switch active audio
          audioElements.switchActiveAudio();
          callbacksRef.current.onCrossfadeSwapGains?.();

          // Clear crossfade state
          clearCrossfade();

          logger.debug('[Crossfade] Gapless transition complete, now playing:', audioElements.getActiveAudioId());
          callbacksRef.current.onCrossfadeComplete?.();
        }, overlapDuration);

        return true;
      }

      const configuredFadeDuration = currentSettings.duration * 1000; // Convert to ms

      // Cap fade duration to the actual time remaining in the outgoing track.
      // Critical for smart crossfade: when outroStart is close to track end
      // (e.g., 2s left), a 10s configured fade would barely reduce the outgoing
      // volume (100% → ~90%) before the track naturally ends, causing both
      // tracks to mix at high volume instead of smoothly transitioning.
      const activeDur = activeAudio.duration;
      const activeTime = activeAudio.currentTime;
      const trackRemainingMs = (!isNaN(activeDur) && activeDur > activeTime)
        ? (activeDur - activeTime) * 1000
        : configuredFadeDuration;
      // Minimum 1s to avoid jarring instant cuts
      const fadeDuration = Math.max(1000, Math.min(configuredFadeDuration, trackRemainingMs));

      if (fadeDuration < configuredFadeDuration) {
        logger.debug('[Crossfade] Fade duration capped to remaining track time', {
          configured: configuredFadeDuration,
          effective: fadeDuration,
          trackRemaining: trackRemainingMs,
        });
      }

      // Tempo matching: calculate target playbackRate for the outgoing track
      // Uses browser-native WSOLA (preservesPitch = true by default) for
      // high-quality pitch-preserving time-stretching at zero CPU cost.
      // Clamped to ±15% to avoid artifacts on large BPM differences.
      const MAX_RATE_CHANGE = 0.15;
      let tempoMatchRate: number | null = null;
      if (currentSettings.tempoMatch && currentBpm && nextBpm && currentBpm > 0 && nextBpm > 0) {
        const rawRate = nextBpm / currentBpm;
        tempoMatchRate = Math.max(1 - MAX_RATE_CHANGE, Math.min(1 + MAX_RATE_CHANGE, rawRate));
        if (Math.abs(tempoMatchRate - 1) < 0.01) {
          tempoMatchRate = null; // Skip if BPMs are essentially the same
        } else {
          logger.debug('[Crossfade] Tempo match enabled', {
            currentBpm,
            nextBpm,
            targetRate: tempoMatchRate,
          });
          // Ensure preservesPitch is enabled (it's true by default but be explicit)
          activeAudio.preservesPitch = true;
        }
      }

      // Use requestAnimationFrame for smoother volume transitions
      // This avoids the timing issues of setInterval that cause crackling
      crossfadeStartTimeRef.current = performance.now();

      // Extracted completion logic — called by both rAF animation and backup timeout.
      // Uses a guard (crossfadeStartTimeRef.current === null) to prevent double-execution.
      //
      // Order matters to prevent race conditions:
      // 1. Set final volumes
      // 2. Pause old audio (prevents 'ended' event from firing)
      // 3. Switch active audio (so even if 'ended' fires, it's from "inactive" → ignored)
      // 4. THEN clear crossfade state (isCrossfading stays true until switch is done)
      //
      // Previously, clearCrossfade() was called first (setting isCrossfading=false),
      // then a 10ms setTimeout did stopActive+switch. During that gap, the old track's
      // 'ended' event would fire and be processed by handleEnded (since isCrossfading
      // was false and the old audio was still "active"), triggering handlePlayNext which
      // killed the new track via stopInactive(). This caused playback to stop after
      // every crossfade on mobile.
      //
      // Also: we pause() the old audio WITHOUT clearing src ('audio.src = ""').
      // On mobile, clearing src revokes the element's autoplay permission, causing
      // future play() calls to fail with NotAllowedError. The src is harmlessly
      // overwritten when loadOnInactive() prepares the next crossfade.
      const finishCrossfade = (source: string) => {
        // Guard: if already completed by the other mechanism, bail out
        if (crossfadeStartTimeRef.current === null) return;

        // Re-read effective volume for the incoming track (in case user changed volume mid-crossfade)
        const getVolFn = getEffectiveVolumeRef.current;
        const finalInactiveVolume = getVolFn ? getVolFn(inactiveId) : audioElements.volume;

        // Set final volumes
        audioElements.setAudioVolume(activeId, 0);
        audioElements.setAudioVolume(inactiveId, finalInactiveVolume);

        // Pause old audio immediately (prevents 'ended' from firing)
        const oldAudio = audioElements.getActiveAudio();
        if (oldAudio) {
          oldAudio.playbackRate = 1; // Reset tempo match
          oldAudio.pause();
          oldAudio.currentTime = 0;
        }

        // Switch active audio BEFORE clearing crossfade state
        audioElements.switchActiveAudio();
        callbacksRef.current.onCrossfadeSwapGains?.();

        // NOW safe to clear crossfade state
        clearCrossfade();

        logger.debug('[Crossfade] Crossfade complete via', source, '- switched to:', audioElements.getActiveAudioId());
        callbacksRef.current.onCrossfadeComplete?.();
      };

      const animateFade = (currentTime: number) => {
        const startTime = crossfadeStartTimeRef.current;
        if (startTime === null) return;

        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / fadeDuration);

        // Use equal-power curve for perceptually smooth fade
        const { fadeOut, fadeIn } = equalPowerFade(progress);

        // Re-read effective volumes each frame to handle user volume changes mid-crossfade.
        // If the user moves the volume slider during crossfade, the new volume is reflected
        // in the next frame rather than being overridden by the captured values.
        const getVolFn = getEffectiveVolumeRef.current;
        const activeVol = getVolFn ? getVolFn(activeId) : audioElements.volume;
        const inactiveVol = getVolFn ? getVolFn(inactiveId) : audioElements.volume;

        // Apply volumes with each track's own effective volume (includes LUFS gain)
        // Active track fades out from its volume, inactive fades in to its volume
        audioElements.setAudioVolume(activeId, fadeOut * activeVol);
        audioElements.setAudioVolume(inactiveId, fadeIn * inactiveVol);

        // Tempo match: gradually adjust outgoing track's playbackRate toward target
        // Linear interpolation from 1.0 → tempoMatchRate over the crossfade duration
        if (tempoMatchRate !== null) {
          activeAudio.playbackRate = 1 + (tempoMatchRate - 1) * progress;
        }

        if (progress < 1) {
          // Continue animation
          animationFrameRef.current = requestAnimationFrame(animateFade);
        } else {
          finishCrossfade('rAF');
        }
      };

      // Start the animation loop
      animationFrameRef.current = requestAnimationFrame(animateFade);

      // Backup: complete crossfade if rAF is suspended (mobile background/screen off).
      // requestAnimationFrame callbacks are paused when the page is hidden (documented
      // browser behavior to save battery), but setTimeout still fires (throttled to ~1s
      // in background). For a 5-12s crossfade, this ~1s granularity is acceptable.
      // The finishCrossfade guard prevents double-execution if rAF already completed.
      crossfadeTimeoutRef.current = window.setTimeout(() => {
        finishCrossfade('backup-timeout');
      }, fadeDuration + 500);

      return true;
    } catch (error) {
      logger.error('[Crossfade] Failed to perform crossfade:', (error as Error).message);
      clearCrossfade();
      return false;
    }
  }, [audioElements, clearCrossfade]);

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
   *
   * Smart mode: Uses track's detected outroStart (silence/fade point) if available
   * Normal mode: Uses fixed duration before track end
   */
  const checkCrossfadeTiming = useCallback((): boolean => {
    // Read settings from ref to always use the latest values without
    // needing settings in the useCallback dependency array.
    const currentSettings = settingsRef.current;

    // Skip if crossfade is disabled, already crossfading, in radio mode, or repeat one.
    // Use isCrossfadingRef (synchronous) instead of isCrossfading (React state) to prevent
    // race conditions where timeupdate fires before React re-renders with the new state.
    if (!currentSettings.enabled || isCrossfadingRef.current || isRadioMode || repeatMode === 'one') {
      return false;
    }

    // Check if there's a next track to play
    if (!hasNextTrack) {
      return false;
    }

    const duration = audioElements.getDuration();
    const currentTime = audioElements.getCurrentTime();
    const crossfadeDuration = currentSettings.duration;

    // On platforms without volume control (iOS Safari), we can't do a real
    // volume-based crossfade — only a brief overlap where both tracks play
    // simultaneously. Cap the trigger window so the overlap stays short and
    // the outgoing track plays nearly to completion instead of being cut early.
    // On desktop browsers (volume control supported), use the full configured duration.
    const effectiveDuration = volumeControlSupportedRef.current
      ? crossfadeDuration
      : Math.min(crossfadeDuration, 2);

    // Smart mode: use track's detected outro start time if available
    // This triggers crossfade when the song naturally ends (silence/fade detected)
    // This is the "detect when the song drops below -X dB" feature — the backend
    // analyzes each track's audio and stores the point where the outro begins.
    if (currentSettings.smartMode && currentTrackOutroStart !== undefined && currentTrackOutroStart > 0) {
      // Use the earlier of outroStart or (duration - effectiveDuration) as trigger point.
      // This ensures there's enough time for a meaningful transition even when outroStart
      // is very close to the track end (e.g., only 2s of silence detected).
      const normalTriggerPoint = duration - effectiveDuration;
      const smartTriggerPoint = Math.min(currentTrackOutroStart, normalTriggerPoint);

      if (
        currentTime >= smartTriggerPoint &&
        !crossfadeStartedRef.current &&
        duration > effectiveDuration
      ) {
        logger.debug('[Crossfade] Smart mode: triggering crossfade', {
          currentTime,
          outroStart: currentTrackOutroStart,
          triggerPoint: smartTriggerPoint,
          duration,
          volumeControlSupported: volumeControlSupportedRef.current,
        });
        crossfadeStartedRef.current = true;
        return true;
      }
      return false;
    }

    // Normal mode: use fixed duration before track end
    const timeRemaining = duration - currentTime;

    // Start crossfade when time remaining equals the effective duration.
    // On iOS, this fires ~2s before end (gapless-style).
    // On desktop, this fires at the configured duration (full crossfade).
    if (
      timeRemaining <= effectiveDuration &&
      timeRemaining > 0 &&
      !crossfadeStartedRef.current &&
      duration > effectiveDuration
    ) {
      crossfadeStartedRef.current = true;
      return true;
    }

    return false;
  }, [isRadioMode, repeatMode, hasNextTrack, audioElements, currentTrackOutroStart]);

  /**
   * Ref-based handler for timeupdate events.
   * Uses the same ref indirection pattern as handleEnded in PlayerContext to
   * prevent listener churn. Previously, the timeupdate effect depended on
   * checkCrossfadeTiming (which changes when isCrossfading toggles), causing
   * rapid listener removal/re-addition during crossfade transitions.
   * On mobile, the timeupdate event could fire in the gap between removal
   * and re-attachment, causing a missed crossfade trigger.
   */
  const handleTimeUpdateRef = useRef<() => void>(() => {});

  // Keep the handler up to date with the latest checkCrossfadeTiming logic
  useEffect(() => {
    handleTimeUpdateRef.current = () => {
      if (checkCrossfadeTiming()) {
        logger.debug('[Crossfade] Triggering crossfade to next track');
        callbacksRef.current.onCrossfadeTrigger?.();
      }
    };
  }, [checkCrossfadeTiming]);

  // Stable event listeners - only set up once when audio elements are created.
  // The ref indirection ensures the handler always uses the latest state
  // without needing to remove/re-add DOM event listeners on every state change.
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handleTimeUpdate = () => {
      handleTimeUpdateRef.current();
    };

    audioA.addEventListener('timeupdate', handleTimeUpdate);
    audioB.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audioA.removeEventListener('timeupdate', handleTimeUpdate);
      audioB.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioElements.audioRefA, audioElements.audioRefB]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCrossfade();
    };
  }, [clearCrossfade]);

  return {
    // State
    isCrossfading,
    // Synchronous ref for checking crossfade state without React render delays.
    // Use this in event handlers where the React state might not have updated yet.
    isCrossfadingRef,

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
