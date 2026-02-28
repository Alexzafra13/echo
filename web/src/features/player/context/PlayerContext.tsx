/**
 * PlayerContext
 *
 * Central orchestrator for all player functionality.
 * Uses specialized hooks for different concerns:
 * - useAudioElements: Dual audio element management
 * - useQueueManagement: Queue and playback order
 * - usePlayTracking: Play session analytics
 * - useCrossfadeLogic: Crossfade transitions
 * - useRadioPlayback: Radio station streaming
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Track, PlayerContextValue, RadioStation, PlayContext } from '../types';
import { useStreamToken } from '../hooks/useStreamToken';
import { usePlayerSettingsStore } from '../store';
import { useAudioElements } from '../hooks/useAudioElements';
import { useAudioNormalization } from '../hooks/useAudioNormalization';
import { usePlayTracking } from '../hooks/usePlayTracking';
import { useQueueManagement } from '../hooks/useQueueManagement';
import { useCrossfadeLogic } from '../hooks/useCrossfadeLogic';
import { useRadioPlayback } from '../hooks/useRadioPlayback';
import { useAutoplay } from '../hooks/useAutoplay';
import { useRadioMetadata } from '@features/radio/hooks/useRadioMetadata';
import { logger } from '@shared/utils/logger';
import { useMediaSession } from '../hooks/useMediaSession';
import { useSocialSync } from '../hooks/useSocialSync';
import type { RadioBrowserStation } from '@shared/types/radio.types';

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // ========== EXTERNAL HOOKS ==========
  const { data: streamTokenData, ensureToken } = useStreamToken();

  // Player settings from Zustand store
  const crossfadeSettings = usePlayerSettingsStore((s) => s.crossfade);
  const normalizationSettings = usePlayerSettingsStore((s) => s.normalization);
  const autoplaySettings = usePlayerSettingsStore((s) => s.autoplay);
  const setCrossfadeEnabledStore = usePlayerSettingsStore((s) => s.setCrossfadeEnabled);
  const setCrossfadeDurationStore = usePlayerSettingsStore((s) => s.setCrossfadeDuration);
  const setCrossfadeSmartModeStore = usePlayerSettingsStore((s) => s.setCrossfadeSmartMode);
  const setCrossfadeTempoMatchStore = usePlayerSettingsStore((s) => s.setCrossfadeTempoMatch);
  const setNormalizationEnabledStore = usePlayerSettingsStore((s) => s.setNormalizationEnabled);
  const setNormalizationTargetLufsStore = usePlayerSettingsStore(
    (s) => s.setNormalizationTargetLufs
  );
  const setNormalizationPreventClippingStore = usePlayerSettingsStore(
    (s) => s.setNormalizationPreventClipping
  );
  const setAutoplayEnabledStore = usePlayerSettingsStore((s) => s.setAutoplayEnabled);

  const autoplay = useAutoplay();

  // ========== STATE ==========
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [userVolume, setUserVolumeState] = useState(0.7); // Volumen del usuario (para el slider)
  const [isAutoplayActive, setIsAutoplayActive] = useState(false); // Indica si estamos reproduciendo desde autoplay
  const [autoplaySourceArtist, setAutoplaySourceArtist] = useState<string | null>(null); // Artista fuente del autoplay

  // Ref for playNext callback to avoid circular dependencies
  const playNextRef = useRef<(useCrossfade: boolean) => void>(() => {});

  // Ref to track current track's BPM for tempo-matched crossfade.
  // Used inside playTrack without adding currentTrack to its dependency array.
  const currentTrackBpmRef = useRef<number | undefined>(undefined);

  // Ref to store the play context of the current queue (album, playlist, artist, etc.)
  // This is passed to startPlaySession so all tracks in a queue inherit the originating context.
  const queueContextRef = useRef<PlayContext | undefined>(undefined);

  // Ref to suppress pause events during track transitions on mobile.
  // When loading a new track, audio.load() fires a 'pause' event which sets isPlaying=false.
  // On mobile, this flicker causes MediaSession to report 'paused', which can revoke
  // the browser's autoplay permission and prevent the next play() from succeeding.
  const isTransitioningRef = useRef(false);

  // ========== GAPLESS PRELOAD (mobile PWA background audio continuity) ==========
  // On mobile PWA, when a track ends and no audio is playing, the OS revokes
  // audio focus and play() fails with NotAllowedError. Crossfade avoids this
  // by starting the next track BEFORE the current one ends. For non-crossfade
  // mode, we preload the next track and start it silently (vol 0) just before
  // the current track ends, keeping the audio session alive.
  const preloadedNextRef = useRef<{
    trackId: string;
    nextIndex: number;
    track: Track;
    prePlayed: boolean;
  } | null>(null);

  // ========== AUDIO ELEMENTS ==========
  const audioElements = useAudioElements({
    initialVolume: 0.7,
    callbacks: {
      onPlay: () => setIsPlaying(true),
      onPause: () => {
        // Suppress pause events during track transitions (mobile autoplay fix).
        // audio.load() fires 'pause' which would flicker isPlaying and break
        // the mobile browser's autoplay permission chain.
        if (!isTransitioningRef.current) {
          setIsPlaying(false);
        }
      },
      onTimeUpdate: (time) => setCurrentTime(time),
      onDurationChange: (dur) => setDuration(dur),
    },
  });

  // ========== AUDIO NORMALIZATION ==========
  const normalization = useAudioNormalization(normalizationSettings);

  // Register audio elements with normalization hook (for volume-based normalization)
  // Note: userVolume is accessed via ref to avoid re-running effect on volume changes
  const userVolumeRef = useRef(userVolume);
  userVolumeRef.current = userVolume;

  // Keep BPM ref in sync with current track
  currentTrackBpmRef.current = currentTrack?.bpm;

  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (audioA && audioB) {
      normalization.registerAudioElements(audioA, audioB);
      // Sync initial volume with normalization hook
      normalization.setUserVolume(userVolumeRef.current);
    }
  }, [audioElements.audioRefA, audioElements.audioRefB, normalization]);

  // ========== QUEUE MANAGEMENT ==========
  const queue = useQueueManagement();

  // ========== PLAY TRACKING ==========
  const playTracking = usePlayTracking({
    audioElements,
    isShuffle: queue.isShuffle,
    isAutoplayActive,
  });

  // ========== RADIO PLAYBACK ==========
  const radio = useRadioPlayback({
    audioElements,
  });

  // ========== CROSSFADE LOGIC ==========
  const crossfade = useCrossfadeLogic({
    audioElements,
    settings: crossfadeSettings,
    isRadioMode: radio.isRadioMode,
    repeatMode: queue.repeatMode,
    hasNextTrack: queue.repeatMode === 'all' || queue.currentIndex < queue.queue.length - 1,
    currentTrackOutroStart: currentTrack?.outroStart, // Smart crossfade: use detected outro start
    onCrossfadeStart: () => {
      // Tell normalization to stop overriding per-element volumes.
      // From this point, only the crossfade animation controls audio.volume.
      normalization.setCrossfading(true);
    },
    onCrossfadeCleared: () => {
      // Crossfade ended (completion, cancel, or error) — let normalization
      // resume normal volume management.
      normalization.setCrossfading(false);
    },
    onCrossfadeTrigger: () => {
      // End current play session before crossfade
      playTracking.endPlaySession(false);
      // Mark as crossfading IMMEDIATELY (synchronously) before the async playTrack call.
      // Without this, there's a gap: onCrossfadeTrigger → handlePlayNext → playTrack →
      // await getStreamUrl. If the track ends during that await (e.g., user seeked to
      // the last few seconds), handleEnded fires and sees isCrossfadingRef=false,
      // double-advancing the queue and playing the wrong track.
      crossfade.isCrossfadingRef.current = true;
      // Trigger next track with crossfade
      playNextRef.current(true);
    },
    // LUFS normalization support - use separate effective volumes for each audio
    getEffectiveVolume: normalization.getEffectiveVolume,
    onCrossfadeSwapGains: normalization.swapGains,
    // Platform capability: false on iOS Safari where audio.volume is read-only
    volumeControlSupported: audioElements.volumeControlSupported,
  });

  // ========== RADIO METADATA ==========
  const { metadata: radioMetadata } = useRadioMetadata({
    stationUuid: radio.currentStation?.stationUuid || null,
    streamUrl: radio.currentStation?.url || null,
    isPlaying: isPlaying && radio.isRadioMode,
  });

  // Sync radio metadata to radio state
  // Note: Only depend on radioMetadata, not the entire radio object (which is recreated each render)
  useEffect(() => {
    radio.setMetadata(radioMetadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioMetadata]);

  // Update radio signal status based on audio events
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handlePlaying = () => {
      if (radio.isRadioMode) radio.setSignalStatus('good');
    };
    const handleWaiting = () => {
      if (radio.isRadioMode) radio.setSignalStatus('weak');
    };
    const handleStalled = () => {
      if (radio.isRadioMode) radio.setSignalStatus('weak');
    };
    const handleError = () => {
      if (radio.isRadioMode) radio.setSignalStatus('error');
    };

    audioA.addEventListener('playing', handlePlaying);
    audioA.addEventListener('waiting', handleWaiting);
    audioA.addEventListener('stalled', handleStalled);
    audioA.addEventListener('error', handleError);
    audioB.addEventListener('playing', handlePlaying);
    audioB.addEventListener('waiting', handleWaiting);
    audioB.addEventListener('stalled', handleStalled);
    audioB.addEventListener('error', handleError);

    return () => {
      audioA.removeEventListener('playing', handlePlaying);
      audioA.removeEventListener('waiting', handleWaiting);
      audioA.removeEventListener('stalled', handleStalled);
      audioA.removeEventListener('error', handleError);
      audioB.removeEventListener('playing', handlePlaying);
      audioB.removeEventListener('waiting', handleWaiting);
      audioB.removeEventListener('stalled', handleStalled);
      audioB.removeEventListener('error', handleError);
    };
    // Note: Only depend on audioElements refs, not the entire radio object
    // radio.isRadioMode and radio.setSignalStatus are accessed inside handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioElements.audioRefA, audioElements.audioRefB]);

  // ========== TRACK PLAYBACK ==========

  /**
   * Build stream URL for a track
   * Uses custom streamUrl if available (for federated/remote tracks)
   * Now async to wait for token if not yet available
   */
  const getStreamUrl = useCallback(
    async (track: Track): Promise<string | null> => {
      // Try to get token from cache first
      let token: string | null = streamTokenData?.token ?? null;

      // If no token in cache, wait for it to load
      if (!token) {
        logger.debug('[Player] Token not in cache, waiting for it...');
        token = await ensureToken();
      }

      if (!token) {
        logger.error('[Player] Stream token not available after waiting');
        return null;
      }

      // If track has a custom stream URL (e.g., federated track), add token to it
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
   * Play a track with optional crossfade
   */
  const playTrack = useCallback(
    async (track: Track, withCrossfade: boolean = false) => {
      // Set transitioning guard early to suppress pause events during the
      // async getStreamUrl call. Without this, on mobile PWA: track ends →
      // both audios paused → handlePause fires → isPlaying=false →
      // MediaSession='paused' → OS revokes audio focus → next play() fails.
      isTransitioningRef.current = true;

      const streamUrl = await getStreamUrl(track);
      if (!streamUrl) {
        logger.warn('[Player] Cannot play track: stream URL unavailable');
        isTransitioningRef.current = false;
        // Reset crossfading ref if it was set early by onCrossfadeTrigger
        crossfade.clearCrossfade();
        return;
      }

      // Exit radio mode if active (must await to prevent race condition)
      if (radio.isRadioMode) {
        await radio.stopRadio();
      }

      // Use isCrossfadingRef as a synchronous guard: if onCrossfadeTrigger already set it
      // to true, we MUST take the crossfade path even if `isPlaying` is stale in this closure.
      // When crossfade settings change, the callback cascade (performCrossfade → crossfade →
      // playTrack → handlePlayNext → playNextRef) updates asynchronously via useEffect.
      // During that gap, a stale playTrack with isPlaying=false could take the else branch,
      // calling clearCrossfade() while both audio elements are already playing.
      if (
        withCrossfade &&
        crossfadeSettings.enabled &&
        (isPlaying || crossfade.isCrossfadingRef.current)
      ) {
        // Crossfade path: both audios will be playing simultaneously so
        // handlePause won't fire. Clear the transitioning guard; crossfade
        // manages its own state via isCrossfadingRef.
        isTransitioningRef.current = false;

        // Crossfade: apply gain ONLY to the inactive audio element
        // This prevents the current track from jumping in volume
        const inactiveId = audioElements.getActiveAudioId() === 'A' ? 'B' : 'A';
        normalization.applyGainToAudio(track, inactiveId);

        // Prepare next track on inactive audio
        logger.debug('[Player] Starting crossfade to:', track.title);
        crossfade.prepareCrossfade(streamUrl);

        // Update track state
        setCurrentTrack(track);

        // Start crossfade transition. On mobile, playInactive() can fail due to
        // autoplay policy. If crossfade fails, fall back to normal (non-crossfade) playback.
        // Pass BPM values for tempo matching (outgoing track BPM from ref, incoming from track param)
        const crossfadeStarted = await crossfade.performCrossfade(
          currentTrackBpmRef.current,
          track.bpm
        );

        if (!crossfadeStarted) {
          // Crossfade failed - fall back to normal playback so the music doesn't stop
          logger.warn('[Player] Crossfade failed on mobile, falling back to normal playback');
          isTransitioningRef.current = true;
          normalization.applyGain(track);
          audioElements.stopInactive();
          audioElements.loadOnActive(streamUrl);

          try {
            await audioElements.playActive();
          } catch (error) {
            logger.warn('[Player] Fallback play failed, retrying:', (error as Error).message);
            try {
              await audioElements.playActive(false);
            } catch (retryError) {
              logger.error('[Player] Fallback retry failed:', (retryError as Error).message);
            }
          } finally {
            isTransitioningRef.current = false;
            if (audioElements.getActiveAudio()?.paused) {
              setIsPlaying(false);
            }
          }
        }

        // Start new play session with queue context if available
        playTracking.startPlaySession(track, queueContextRef.current);
      } else {
        // Normal play (no crossfade) - apply gain to both elements
        // isTransitioningRef is already true from the top of playTrack
        normalization.applyGain(track);

        crossfade.clearCrossfade();
        audioElements.stopInactive();
        audioElements.loadOnActive(streamUrl);

        setCurrentTrack(track);
        playTracking.startPlaySession(track, queueContextRef.current);

        try {
          // Play immediately without buffer wait to minimize the gap between
          // tracks. On mobile PWA, waiting for buffer (3s timeout) gives the OS
          // enough time to revoke audio focus, causing play() to fail.
          await audioElements.playActive(false);
        } catch (error) {
          // Immediate play failed — retry with buffer wait as fallback.
          // This covers the case where the audio needs more buffering.
          logger.warn(
            '[Player] Immediate play failed, retrying with buffer:',
            (error as Error).message
          );
          try {
            await audioElements.playActive();
          } catch (retryError) {
            logger.error('[Player] Retry failed:', (retryError as Error).message);
          }
        } finally {
          isTransitioningRef.current = false;
          // Sync isPlaying with actual audio state after transition completes.
          // Pause events were suppressed during transition, so we need to check
          // if play actually succeeded or if the audio is still paused.
          if (audioElements.getActiveAudio()?.paused) {
            setIsPlaying(false);
          }
        }
      }

      // Note: crossfadeStartedRef is now reset inside clearCrossfade() which runs
      // when the crossfade completes (finishCrossfade) or when a new track starts
      // normally (non-crossfade path calls clearCrossfade). No need for a separate
      // resetCrossfadeFlag() call here, which previously ran while the crossfade
      // animation was still in progress and caused race conditions.
    },
    [
      getStreamUrl,
      radio,
      crossfadeSettings.enabled,
      isPlaying,
      crossfade,
      audioElements,
      playTracking,
      normalization,
    ]
  );

  /**
   * Play - either a new track or resume current playback
   */
  const play = useCallback(
    (track?: Track, withCrossfade: boolean = false) => {
      if (track) {
        playTrack(track, withCrossfade);
      } else if (currentTrack && !radio.isRadioMode) {
        // Resume current track
        audioElements.playActive();
      } else if (radio.isRadioMode && radio.currentStation) {
        // Resume radio
        radio.resumeRadio();
      }
    },
    [playTrack, currentTrack, radio, audioElements]
  );

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    audioElements.pauseActive();
  }, [audioElements]);

  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    audioElements.stopBoth();
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioElements]);

  /**
   * Seek to time
   */
  const seek = useCallback(
    (time: number) => {
      audioElements.seek(time);
      setCurrentTime(time);
      // Reset crossfade flag so timing check can re-trigger after seek.
      // Without this, seeking backward after a crossfade trigger point
      // leaves the flag set, preventing crossfade from ever firing again.
      crossfade.resetCrossfadeFlag();
    },
    [audioElements, crossfade]
  );

  /**
   * Set volume (applies normalization gain automatically)
   */
  const setVolume = useCallback(
    (volume: number) => {
      // Update user volume state (for slider UI)
      setUserVolumeState(volume);
      // Update normalization hook's user volume (it will apply effective volume to audio elements)
      normalization.setUserVolume(volume);
    },
    [normalization]
  );

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // ========== QUEUE OPERATIONS ==========

  /**
   * Trigger autoplay with similar artists
   * @returns true if autoplay was triggered, false otherwise
   */
  const triggerAutoplay = useCallback(
    async (useCrossfade: boolean = false): Promise<boolean> => {
      const canAutoplay = autoplaySettings.enabled && currentTrack?.artistId && !radio.isRadioMode;

      if (!canAutoplay || !currentTrack?.artistId) {
        logger.debug('[Player] Cannot autoplay - conditions not met');
        setIsPlaying(false);
        setIsAutoplayActive(false);
        setAutoplaySourceArtist(null);
        // Reset crossfading state if it was set early by onCrossfadeTrigger
        crossfade.clearCrossfade();
        return false;
      }

      logger.debug('[Player] Triggering autoplay for artist:', currentTrack.artistId);

      const currentQueueIds = new Set(queue.queue.map((t) => t.id));
      const result = await autoplay.loadSimilarArtistTracks(currentTrack.artistId, currentQueueIds);

      if (result.tracks.length > 0) {
        logger.debug(
          `[Player] Autoplay: loaded ${result.tracks.length} tracks from similar artists`
        );
        setIsAutoplayActive(true);
        setAutoplaySourceArtist(result.sourceArtistName);
        queueContextRef.current = 'recommendation';

        // Calculate next index BEFORE adding to queue
        const nextIndex = queue.queue.length;
        // Add tracks to queue and play
        queue.addToQueue(result.tracks);
        queue.setCurrentIndex(nextIndex);
        playTrack(result.tracks[0], useCrossfade);
        return true;
      } else {
        logger.debug('[Player] Autoplay: no similar tracks found');
        setIsPlaying(false);
        setIsAutoplayActive(false);
        setAutoplaySourceArtist(null);
        // Reset crossfading state if it was set early by onCrossfadeTrigger
        crossfade.clearCrossfade();
        return false;
      }
    },
    [
      autoplaySettings.enabled,
      currentTrack,
      radio.isRadioMode,
      queue,
      autoplay,
      playTrack,
      crossfade,
    ]
  );

  /**
   * Handle playing next track
   */
  const handlePlayNext = useCallback(
    async (useCrossfade: boolean = false) => {
      if (queue.queue.length === 0) {
        crossfade.clearCrossfade();
        return;
      }

      // End current session as skipped if there's an active session
      if (playTracking.hasActiveSession()) {
        playTracking.endPlaySession(true);
      }

      const nextIndex = queue.getNextIndex();

      // No next track - try autoplay
      if (nextIndex === -1) {
        logger.debug('[Player] No next track in queue');
        logger.debug('[Player] Attempting autoplay');
        await triggerAutoplay(useCrossfade);
        return;
      }

      queue.setCurrentIndex(nextIndex);
      const nextTrack = queue.getTrackAt(nextIndex);
      if (nextTrack) {
        playTrack(nextTrack, useCrossfade);
      }
    },
    [queue, playTracking, playTrack, triggerAutoplay, crossfade]
  );

  // Update ref for crossfade callback
  useEffect(() => {
    playNextRef.current = handlePlayNext;
  }, [handlePlayNext]);

  /**
   * Play next track in queue (crossfade if enabled and currently playing)
   */
  const playNext = useCallback(() => {
    const useCrossfade = crossfadeSettings.enabled && isPlaying;
    handlePlayNext(useCrossfade);
  }, [handlePlayNext, crossfadeSettings.enabled, isPlaying]);

  /**
   * Play previous track in queue
   */
  const playPrevious = useCallback(() => {
    if (queue.queue.length === 0) return;

    // If more than 3 seconds played, restart current track
    if (audioElements.getCurrentTime() > 3) {
      seek(0);
      return;
    }

    // End current session as skipped
    if (playTracking.hasActiveSession()) {
      playTracking.endPlaySession(true);
    }

    const prevIndex = queue.getPreviousIndex();
    queue.setCurrentIndex(prevIndex);
    const prevTrack = queue.getTrackAt(prevIndex);
    if (prevTrack) {
      const useCrossfade = crossfadeSettings.enabled && isPlaying;
      playTrack(prevTrack, useCrossfade);
    }
  }, [queue, audioElements, playTracking, playTrack, seek, crossfadeSettings.enabled, isPlaying]);

  /**
   * Play a queue of tracks starting at index
   * Does NOT auto-shuffle - caller is responsible for shuffle state and track order
   */
  const playQueue = useCallback(
    (tracks: Track[], startIndex: number = 0, context?: PlayContext) => {
      // Reset autoplay state when user starts new playback
      setIsAutoplayActive(false);
      setAutoplaySourceArtist(null);
      autoplay.resetSession();

      // Store the originating context so all tracks in this queue
      // inherit it for play tracking (album, playlist, artist, etc.)
      queueContextRef.current = context;

      queue.setQueue(tracks, startIndex);
      if (tracks[startIndex]) {
        playTrack(tracks[startIndex], false);
      }
    },
    [queue, playTrack, autoplay]
  );

  /**
   * Remove track from queue
   */
  const removeFromQueue = useCallback(
    (index: number) => {
      const wasCurrentTrack = index === queue.currentIndex;
      queue.removeFromQueue(index);

      if (wasCurrentTrack && queue.queue.length > 0) {
        // Play next track if we removed the current one
        const nextTrack = queue.getTrackAt(queue.currentIndex);
        if (nextTrack) {
          playTrack(nextTrack, false);
        }
      }
    },
    [queue, playTrack]
  );

  // ========== TRACK ENDED HANDLER ==========
  // Use ref-based handler to prevent event listener churn during track transitions.
  // Previously, this effect had 11 dependencies that changed during every track transition,
  // causing the 'ended' listeners to be rapidly removed and re-added. On mobile browsers,
  // the 'ended' event could fire in the gap between removal and re-attachment, causing
  // playback to silently stop after the current track finished.
  const handleEndedRef = useRef<(event: Event) => void>(() => {});

  // Keep the handler up to date with the latest state and callbacks
  useEffect(() => {
    handleEndedRef.current = async (event: Event) => {
      const endedAudio = event.target as HTMLAudioElement;
      const activeAudio = audioElements.getActiveAudio();

      // CRITICAL: Ignore ended events from the inactive audio element
      // This prevents the old track from triggering playNext after a crossfade
      if (endedAudio !== activeAudio) {
        logger.debug('[Player] Ignoring ended event from inactive audio element');
        return;
      }

      // Only handle ended if not in crossfade mode.
      // Use isCrossfadingRef (synchronous) instead of isCrossfading (React state)
      // to prevent race conditions where the ended event fires before React re-renders.
      if (crossfade.isCrossfadingRef.current) return;

      // Record completed play (not skipped)
      playTracking.endPlaySession(false);

      const hasNextTrack = queue.hasNext();

      logger.debug('[Player] Track ended - checking next action', {
        repeatMode: queue.repeatMode,
        hasNext: hasNextTrack,
        currentIndex: queue.currentIndex,
        queueLength: queue.queue.length,
        autoplayEnabled: autoplaySettings.enabled,
        artistId: currentTrack?.artistId || 'MISSING',
        artistName: currentTrack?.artist || 'MISSING',
        isRadioMode: radio.isRadioMode,
      });

      if (queue.repeatMode === 'one') {
        logger.debug('[Player] Repeat one - replaying current track');
        audioElements.playActive();
      } else if (hasNextTrack) {
        // Check if the next track was gapless-preloaded and is already pre-playing
        const nextIndex = queue.getNextIndex();
        const nextTrack = nextIndex !== -1 ? queue.getTrackAt(nextIndex) : null;
        const preloaded = preloadedNextRef.current;

        if (nextTrack && preloaded && preloaded.trackId === nextTrack.id && preloaded.prePlayed) {
          // GAPLESS: inactive element is already playing at volume 0.
          // Just switch and restore volume — no async gap, no play() call.
          logger.debug('[Player] Gapless transition to:', nextTrack.title);
          isTransitioningRef.current = true;
          preloadedNextRef.current = null;

          queue.setCurrentIndex(nextIndex);
          setCurrentTrack(nextTrack);

          // Switch: inactive (pre-playing at vol 0) becomes active
          audioElements.switchActiveAudio();

          // Restore proper volume
          const activeId = audioElements.getActiveAudioId();
          const vol = normalization.getEffectiveVolume(activeId);
          audioElements.setAudioVolume(activeId, vol);

          // Cleanup old (now inactive)
          audioElements.stopInactive();

          isTransitioningRef.current = false;
          playTracking.startPlaySession(nextTrack, queueContextRef.current);
        } else {
          // Fallback: normal transition (no preload available)
          logger.debug('[Player] Playing next track in queue');
          handlePlayNext(false);
        }
      } else {
        // No more tracks in queue - try autoplay
        logger.debug('[Player] No more tracks - trying autoplay');
        await handlePlayNext(crossfadeSettings.enabled);
      }
    };
  }, [
    audioElements,
    playTracking,
    queue,
    handlePlayNext,
    autoplaySettings.enabled,
    currentTrack,
    radio.isRadioMode,
    crossfadeSettings.enabled,
    normalization,
  ]);

  // Stable event listeners - only set up once when audio elements are created.
  // The ref indirection ensures the handler always uses the latest state
  // without needing to remove/re-add DOM event listeners on every state change.
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handleEnded = (event: Event) => {
      handleEndedRef.current(event);
    };

    audioA.addEventListener('ended', handleEnded);
    audioB.addEventListener('ended', handleEnded);
    return () => {
      audioA.removeEventListener('ended', handleEnded);
      audioB.removeEventListener('ended', handleEnded);
    };
  }, [audioElements.audioRefA, audioElements.audioRefB]);

  // ========== AUTOPLAY PREFETCH ==========
  // Prefetch similar artist tracks when nearing end of queue for instant playback
  useEffect(() => {
    if (!autoplaySettings.enabled || radio.isRadioMode || !currentTrack?.artistId) {
      return;
    }

    const tracksRemaining = queue.queue.length - queue.currentIndex - 1;
    const threshold = autoplay.getPrefetchThreshold();

    // Start prefetch when we're within threshold of queue end
    if (tracksRemaining <= threshold && tracksRemaining >= 0) {
      logger.debug(`[Player] ${tracksRemaining} tracks remaining, prefetching autoplay tracks`);
      const currentQueueIds = new Set(queue.queue.map((t) => t.id));
      autoplay.prefetchSimilarArtistTracks(currentTrack.artistId, currentQueueIds);
    }
  }, [
    autoplaySettings.enabled,
    radio.isRadioMode,
    currentTrack,
    queue.currentIndex,
    queue.queue,
    autoplay,
  ]);

  // ========== GAPLESS PRELOAD HANDLER ==========
  // Ref-based handler for timeupdate events (same pattern as crossfade timing).
  // Phase 1 (15s before end): pre-fetch stream URL + load on inactive element
  // Phase 2 (0.5s before end): start playing inactive at volume 0 (keeps audio session alive)
  const gaplessPreloadHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    gaplessPreloadHandlerRef.current = () => {
      // Skip if crossfade handles transitions (it has its own preloading)
      if (crossfadeSettings.enabled || radio.isRadioMode || !isPlaying) return;

      const audio = audioElements.getActiveAudio();
      if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;

      const timeRemaining = audio.duration - audio.currentTime;
      if (timeRemaining <= 0) return;

      // Phase 1: Preload 15 seconds before track end
      if (timeRemaining <= 15 && !preloadedNextRef.current) {
        if (queue.repeatMode === 'one') return;
        const nextIndex = queue.getNextIndex();
        if (nextIndex === -1) return;
        const nextTrack = queue.getTrackAt(nextIndex);
        if (!nextTrack) return;

        getStreamUrl(nextTrack).then((url) => {
          if (!url || preloadedNextRef.current) return;
          preloadedNextRef.current = {
            trackId: nextTrack.id,
            nextIndex,
            track: nextTrack,
            prePlayed: false,
          };
          audioElements.loadOnInactive(url);
          const inactiveId = audioElements.getActiveAudioId() === 'A' ? 'B' : 'A';
          normalization.applyGainToAudio(nextTrack, inactiveId);
          logger.debug('[Player] Gapless: preloaded next track:', nextTrack.title);
        });
      }

      // Phase 2: Silent pre-play 0.5s before end (keeps audio session alive on mobile)
      const preloaded = preloadedNextRef.current;
      if (timeRemaining <= 0.5 && preloaded && !preloaded.prePlayed) {
        const inactiveAudio = audioElements.getInactiveAudio();
        if (inactiveAudio && inactiveAudio.readyState >= 3) {
          inactiveAudio.volume = 0;
          inactiveAudio
            .play()
            .then(() => {
              if (preloadedNextRef.current) {
                preloadedNextRef.current.prePlayed = true;
              }
              logger.debug('[Player] Gapless: silent pre-play started');
            })
            .catch(() => {
              logger.warn('[Player] Gapless: silent pre-play failed');
            });
        }
      }
    };
  }, [
    crossfadeSettings.enabled,
    radio.isRadioMode,
    isPlaying,
    queue,
    getStreamUrl,
    audioElements,
    normalization,
  ]);

  // Stable timeupdate listener for gapless preloading
  useEffect(() => {
    const audioA = audioElements.audioRefA.current;
    const audioB = audioElements.audioRefB.current;
    if (!audioA || !audioB) return;

    const handleTimeUpdate = () => gaplessPreloadHandlerRef.current();

    audioA.addEventListener('timeupdate', handleTimeUpdate);
    audioB.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioA.removeEventListener('timeupdate', handleTimeUpdate);
      audioB.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioElements.audioRefA, audioElements.audioRefB]);

  // Clear preload when track changes
  useEffect(() => {
    preloadedNextRef.current = null;
  }, [currentTrack]);

  // ========== MEDIA SESSION API (for mobile background playback) ==========
  useMediaSession({
    currentTrack,
    radio: {
      isRadioMode: radio.isRadioMode,
      currentStation: radio.currentStation,
      metadata: radio.metadata,
    },
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    playPrevious,
    playNext,
    seek,
  });

  // ========== PWA VISIBILITY SYNC (background audio recovery) ==========
  // When the PWA goes to background on mobile, the OS may suspend audio playback.
  // When it returns to foreground, we need to sync our state with reality:
  // - If isPlaying=true but audio is actually paused → resume or update state
  // - If audio was suspended → attempt to resume playback
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return; // Only act when becoming visible

      const activeAudio = audioElements.getActiveAudio();
      if (!activeAudio) return;

      if (isPlaying && activeAudio.paused && !activeAudio.ended) {
        // State says playing but audio is actually paused — OS suspended it.
        // Try to resume; if it fails, sync state to reality.
        logger.debug('[Player] App foregrounded: audio was suspended, attempting resume');
        activeAudio.play().catch(() => {
          logger.warn('[Player] Resume after foreground failed, syncing state');
          setIsPlaying(false);
        });
      } else if (!isPlaying && !activeAudio.paused) {
        // Audio is playing but state says paused — sync state
        setIsPlaying(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [audioElements, isPlaying]);

  // ========== SOCIAL "LISTENING NOW" SYNC ==========
  useSocialSync({
    isPlaying,
    currentTrackId: currentTrack?.id ?? null,
    isRadioMode: radio.isRadioMode,
  });

  // ========== RADIO OPERATIONS ==========

  /**
   * Play a radio station
   */
  const playRadio = useCallback(
    async (station: RadioStation | RadioBrowserStation) => {
      try {
        // Clear track state
        setCurrentTrack(null);
        queue.clearQueue();
        crossfade.clearCrossfade();

        await radio.playRadio(station);
      } catch (error) {
        logger.error('[Player] Failed to play radio station:', (error as Error).message);
        // Ensure we're not stuck in a bad state
        setIsPlaying(false);
      }
    },
    [radio, queue, crossfade]
  );

  /**
   * Stop radio
   */
  const stopRadio = useCallback(async () => {
    try {
      await radio.stopRadio();
    } catch (error) {
      logger.error('[Player] Failed to stop radio:', (error as Error).message);
    }
    // Always reset state even if stopRadio fails
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [radio]);

  // ========== CROSSFADE SETTINGS ==========

  const setCrossfadeEnabled = useCallback(
    (enabled: boolean) => {
      setCrossfadeEnabledStore(enabled);
    },
    [setCrossfadeEnabledStore]
  );

  const setCrossfadeDuration = useCallback(
    (dur: number) => {
      setCrossfadeDurationStore(dur);
    },
    [setCrossfadeDurationStore]
  );

  const setCrossfadeSmartMode = useCallback(
    (enabled: boolean) => {
      setCrossfadeSmartModeStore(enabled);
    },
    [setCrossfadeSmartModeStore]
  );

  const setCrossfadeTempoMatch = useCallback(
    (enabled: boolean) => {
      setCrossfadeTempoMatchStore(enabled);
    },
    [setCrossfadeTempoMatchStore]
  );

  // ========== NORMALIZATION SETTINGS ==========

  const setNormalizationEnabled = useCallback(
    (enabled: boolean) => {
      setNormalizationEnabledStore(enabled);
      // Re-apply gain with new settings
      normalization.applyGain(currentTrack);
    },
    [setNormalizationEnabledStore, normalization, currentTrack]
  );

  const setNormalizationTargetLufs = useCallback(
    (target: -14 | -16) => {
      setNormalizationTargetLufsStore(target);
      // Re-apply gain with new settings
      normalization.applyGain(currentTrack);
    },
    [setNormalizationTargetLufsStore, normalization, currentTrack]
  );

  const setNormalizationPreventClipping = useCallback(
    (prevent: boolean) => {
      setNormalizationPreventClippingStore(prevent);
      // Re-apply gain with new settings
      normalization.applyGain(currentTrack);
    },
    [setNormalizationPreventClippingStore, normalization, currentTrack]
  );

  // ========== AUTOPLAY SETTINGS ==========

  const setAutoplayEnabled = useCallback(
    (enabled: boolean) => {
      setAutoplayEnabledStore(enabled);
    },
    [setAutoplayEnabledStore]
  );

  // ========== CONTEXT VALUE ==========

  const value: PlayerContextValue = useMemo(
    () => ({
      // Track state
      currentTrack,
      queue: queue.queue,
      currentIndex: queue.currentIndex,
      isPlaying,
      volume: userVolume,
      currentTime,
      duration,
      isShuffle: queue.isShuffle,
      repeatMode: queue.repeatMode,

      // Crossfade state
      crossfade: crossfadeSettings,
      isCrossfading: crossfade.isCrossfading,

      // Normalization state
      normalization: normalizationSettings,

      // Radio state
      currentRadioStation: radio.currentStation,
      isRadioMode: radio.isRadioMode,
      radioMetadata: radio.metadata,
      radioSignalStatus: radio.signalStatus,

      // Autoplay state
      autoplay: autoplaySettings,
      isAutoplayActive,
      autoplaySourceArtist,

      // Playback controls
      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,

      // Queue controls
      addToQueue: queue.addToQueue,
      removeFromQueue,
      clearQueue: queue.clearQueue,
      playQueue,

      // Radio controls
      playRadio,
      stopRadio,

      // Player controls
      seek,
      setVolume,
      toggleShuffle: queue.toggleShuffle,
      setShuffle: queue.setShuffle,
      toggleRepeat: queue.toggleRepeat,

      // Crossfade controls
      setCrossfadeEnabled,
      setCrossfadeDuration,
      setCrossfadeSmartMode,
      setCrossfadeTempoMatch,

      // Normalization controls
      setNormalizationEnabled,
      setNormalizationTargetLufs,
      setNormalizationPreventClipping,

      // Autoplay controls
      setAutoplayEnabled,
    }),
    [
      currentTrack,
      queue.queue,
      queue.currentIndex,
      queue.isShuffle,
      queue.repeatMode,
      queue.addToQueue,
      queue.clearQueue,
      queue.toggleShuffle,
      queue.toggleRepeat,
      isPlaying,
      userVolume,
      currentTime,
      duration,
      crossfadeSettings,
      crossfade.isCrossfading,
      normalizationSettings,
      radio.currentStation,
      radio.isRadioMode,
      radio.metadata,
      radio.signalStatus,
      play,
      pause,
      togglePlayPause,
      stop,
      playNext,
      playPrevious,
      removeFromQueue,
      playQueue,
      playRadio,
      stopRadio,
      seek,
      setVolume,
      setCrossfadeEnabled,
      setCrossfadeDuration,
      setCrossfadeSmartMode,
      setCrossfadeTempoMatch,
      setNormalizationEnabled,
      setNormalizationTargetLufs,
      setNormalizationPreventClipping,
      autoplaySettings,
      isAutoplayActive,
      autoplaySourceArtist,
      setAutoplayEnabled,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
