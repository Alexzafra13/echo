import { useRef, useCallback, useMemo } from 'react';
import type { NormalizationSettings } from '../types';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';

/**
 * Resultado del cálculo de ganancia
 */
interface GainCalculation {
  gainDb: number; // Ganancia a aplicar en dB
  gainLinear: number; // Ganancia en escala lineal
  wasLimited: boolean; // Si se limitó por peak
}

/**
 * Hook para normalización de audio con Web Audio API + fallback a volumen
 *
 * Implementa normalización estilo Apple Music:
 * - Usa Web Audio API GainNode para aplicar ganancia (puede amplificar tracks suaves)
 * - DynamicsCompressorNode como limitador brick-wall a -1 dBFS (previene clipping)
 * - Respeta True Peak para evitar distorsión en codecs lossy
 * - Fallback automático a HTMLAudioElement.volume si Web Audio no está disponible
 *
 * Arquitectura Web Audio (preferida):
 *   audio.volume (crossfade + userVol) → MediaElementSource → GainNode (normalización) → Compressor → speakers
 *
 * Arquitectura Fallback:
 *   audio.volume = userVolume × normalizationGain (capped at 1.0, sin boost)
 *
 * Crossfade support:
 * - Separate GainNodes/gains for audioA and audioB
 * - During crossfade, each audio maintains its own track's normalization gain
 */
export function useAudioNormalization(settings: NormalizationSettings) {
  // === Per-element gain values (used by both Web Audio and fallback paths) ===
  const gainARef = useRef<number>(1);
  const gainBRef = useRef<number>(1);
  const currentGainRef = useRef<number>(1);

  // === Audio element refs ===
  const audioElementsRef = useRef<{
    audioA: HTMLAudioElement | null;
    audioB: HTMLAudioElement | null;
    userVolume: number;
  }>({
    audioA: null,
    audioB: null,
    userVolume: 0.7,
  });

  // === Web Audio API refs ===
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeARef = useRef<GainNode | null>(null);
  const gainNodeBRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const sourceNodeARef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceNodeBRef = useRef<MediaElementAudioSourceNode | null>(null);
  // True when both audio elements are successfully connected to Web Audio graph.
  // When false, all operations fall back to volume-based normalization.
  const webAudioActiveRef = useRef(false);

  // ========== WEB AUDIO API INITIALIZATION ==========

  /**
   * Initialize the Web Audio API graph (AudioContext + nodes).
   * Safe to call multiple times — only creates the graph once.
   *
   * Graph topology:
   *   GainNode A ──┐
   *                ├──→ DynamicsCompressorNode (limiter @ -1 dBFS) ──→ destination
   *   GainNode B ──┘
   *
   * The compressor acts as a brick-wall limiter: any signal above -1 dBFS
   * is compressed at 20:1 ratio with 1ms attack. This prevents clipping
   * when GainNodes boost quiet tracks (gain > 1.0), matching Apple Music's
   * True Peak ceiling of -1 dBTP.
   */
  const initAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) return audioContextRef.current;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        logger.warn('[Normalization] Web Audio API not supported in this browser');
        return null;
      }

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Create gain nodes for each audio element
      const gainA = ctx.createGain();
      const gainB = ctx.createGain();
      gainNodeARef.current = gainA;
      gainNodeBRef.current = gainB;

      // Create compressor as brick-wall limiter at -1 dBFS (Apple Music style)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -1;   // Start limiting at -1 dBFS
      compressor.knee.value = 0;         // Hard knee (brick wall)
      compressor.ratio.value = 20;       // Very high ratio (acts as limiter)
      compressor.attack.value = 0.001;   // 1ms attack (catches transients)
      compressor.release.value = 0.01;   // 10ms release
      compressorRef.current = compressor;

      // Wire: GainA → Compressor → destination
      //       GainB → Compressor → destination
      gainA.connect(compressor);
      gainB.connect(compressor);
      compressor.connect(ctx.destination);

      // Keep-alive: silent oscillator prevents the OS from suspending AudioContext
      // when the page goes to background or screen turns off (PWA/mobile).
      // A running oscillator at gain=0 uses zero CPU but tells the audio system
      // that the context is still needed.
      const keepAlive = ctx.createOscillator();
      const keepAliveGain = ctx.createGain();
      keepAliveGain.gain.value = 0;
      keepAlive.connect(keepAliveGain);
      keepAliveGain.connect(ctx.destination);
      keepAlive.start();

      // Auto-resume: when the OS suspends AudioContext (screen off, tab background),
      // immediately attempt to resume. Combined with MediaSession API (which keeps
      // the audio process alive), this recovers playback without user interaction.
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'suspended') {
          logger.debug('[Normalization] AudioContext suspended, attempting resume');
          ctx.resume().catch(() => {
            logger.warn('[Normalization] Auto-resume failed (may need user gesture)');
          });
        }
      });

      logger.debug('[Normalization] Web Audio API graph initialized');
      return ctx;
    } catch (e) {
      logger.warn('[Normalization] Failed to init Web Audio API:', (e as Error).message);
      return null;
    }
  }, []);

  /**
   * Connect an HTMLAudioElement to the Web Audio graph via MediaElementSourceNode.
   *
   * IMPORTANT: createMediaElementSource() can only be called ONCE per element.
   * After connection, the element's output routes through the Web Audio graph
   * instead of directly to speakers. audio.volume still works as input attenuation.
   */
  const connectAudioElement = useCallback((audio: HTMLAudioElement, audioId: 'A' | 'B') => {
    const ctx = audioContextRef.current;
    const gainNode = audioId === 'A' ? gainNodeARef.current : gainNodeBRef.current;
    const sourceRef = audioId === 'A' ? sourceNodeARef : sourceNodeBRef;

    if (!ctx || !gainNode) return;
    // Already connected — createMediaElementSource throws if called twice
    if (sourceRef.current) return;

    try {
      const source = ctx.createMediaElementSource(audio);
      source.connect(gainNode);
      sourceRef.current = source;
      logger.debug(`[Normalization] Connected audio ${audioId} to Web Audio graph`);

      // Mark Web Audio as active only when BOTH elements are connected
      if (sourceNodeARef.current && sourceNodeBRef.current) {
        webAudioActiveRef.current = true;
        logger.debug('[Normalization] Web Audio fully active (both elements connected)');
      }
    } catch (e) {
      logger.warn(`[Normalization] Failed to connect audio ${audioId}:`, (e as Error).message);
      // If either connection fails, disable Web Audio entirely to avoid
      // one element routing through Web Audio and the other through speakers.
      webAudioActiveRef.current = false;
    }
  }, []);

  /**
   * Resume AudioContext after user gesture (required on mobile).
   * Mobile browsers create AudioContext in 'suspended' state and require
   * a user interaction (tap/click) to resume it. Call this from play/toggle handlers.
   */
  const resumeAudioContext = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
        logger.debug('[Normalization] AudioContext resumed');
      } catch (e) {
        logger.warn('[Normalization] Failed to resume AudioContext:', (e as Error).message);
      }
    }
  }, []);

  // ========== AUDIO ELEMENT MANAGEMENT ==========

  /**
   * Register audio elements for normalization
   */
  const registerAudioElements = useCallback((
    audioA: HTMLAudioElement | null,
    audioB: HTMLAudioElement | null
  ) => {
    audioElementsRef.current.audioA = audioA;
    audioElementsRef.current.audioB = audioB;
  }, []);

  /**
   * Update user volume (called when user changes volume slider)
   */
  const setUserVolume = useCallback((volume: number) => {
    audioElementsRef.current.userVolume = volume;
    applyEffectiveVolume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Apply effective volume to audio elements.
   *
   * Web Audio mode:  audio.volume = userVolume (normalization handled by GainNode)
   * Fallback mode:   audio.volume = min(1.0, userVolume × normGain) (can't boost)
   */
  const applyEffectiveVolume = useCallback(() => {
    const { audioA, audioB, userVolume } = audioElementsRef.current;

    if (webAudioActiveRef.current) {
      // Web Audio: volume controls user preference only; GainNode handles normalization
      if (audioA) audioA.volume = userVolume;
      if (audioB) audioB.volume = userVolume;
    } else {
      // Fallback: bake normalization into audio.volume (capped at 1.0)
      if (audioA) {
        audioA.volume = Math.min(1, userVolume * gainARef.current);
      }
      if (audioB) {
        audioB.volume = Math.min(1, userVolume * gainBRef.current);
      }
    }
  }, []);

  // ========== GAIN CALCULATION ==========

  /**
   * Get effective volume for a specific audio element (for crossfade calculations).
   *
   * Web Audio mode:  returns userVolume (gain is in the GainNode, not audio.volume)
   * Fallback mode:   returns min(1.0, userVolume × gain)
   */
  const getEffectiveVolume = useCallback((audioId: 'A' | 'B'): number => {
    const { userVolume } = audioElementsRef.current;
    if (webAudioActiveRef.current) {
      return userVolume;
    }
    const gain = audioId === 'A' ? gainARef.current : gainBRef.current;
    return Math.min(1, userVolume * gain);
  }, []);

  /**
   * Get raw normalization gain for a specific audio element
   */
  const getGainForAudio = useCallback((audioId: 'A' | 'B'): number => {
    return audioId === 'A' ? gainARef.current : gainBRef.current;
  }, []);

  /**
   * Calculate the normalization gain for a track.
   *
   * Uses ReplayGain data (calculated by backend's LufsAnalyzerService at -16 LUFS target)
   * with optional target adjustment (-14 LUFS for Spotify style).
   *
   * With Web Audio:  gain can be positive (boost quiet tracks) up to +12 dB
   * Without Web Audio: gain is clamped to 0 dB (can only reduce, never boost)
   *
   * Clipping prevention: limits gain so True Peak stays below -1 dBTP
   */
  const calculateGain = useCallback((track: Track | null): GainCalculation => {
    const noGain = { gainDb: 0, gainLinear: 1, wasLimited: false };

    if (!settings.enabled || !track) {
      return noGain;
    }

    const rgTrackGain = track.rgTrackGain;
    const rgTrackPeak = track.rgTrackPeak;

    if (rgTrackGain === undefined || rgTrackGain === null) {
      return noGain;
    }

    // Base gain from ReplayGain + target adjustment
    // Backend analyzes at -16 LUFS (Apple style); adjust if user chose -14 (Spotify style)
    const ANALYSIS_TARGET_LUFS = -16;
    let gainDb = rgTrackGain + (settings.targetLufs - ANALYSIS_TARGET_LUFS);

    let wasLimited = false;

    // Apple Music style: guarantee True Peak ≤ -1 dBTP
    // Prevents inter-sample clipping in lossy codecs (AAC, MP3)
    if (settings.preventClipping && rgTrackPeak !== undefined && rgTrackPeak !== null && rgTrackPeak > 0) {
      const headroomTo0dB = -20 * Math.log10(rgTrackPeak);
      const TRUE_PEAK_CEILING = -1.0;
      const maxAllowedGain = headroomTo0dB + TRUE_PEAK_CEILING;

      if (gainDb > maxAllowedGain) {
        gainDb = maxAllowedGain;
        wasLimited = true;
      }
    }

    // Safety cap: never boost more than +12 dB even with Web Audio
    // Prevents excessive amplification of noise in very quiet recordings
    const MAX_BOOST_DB = 12;
    if (webAudioActiveRef.current) {
      if (gainDb > MAX_BOOST_DB) {
        gainDb = MAX_BOOST_DB;
        wasLimited = true;
      }
    } else {
      // Fallback: can't boost at all (audio.volume capped at 1.0)
      if (gainDb > 0) {
        gainDb = 0;
        wasLimited = true;
      }
    }

    const gainLinear = Math.pow(10, gainDb / 20);

    return {
      gainDb,
      gainLinear,
      wasLimited,
    };
  }, [settings.enabled, settings.targetLufs, settings.preventClipping]);

  // ========== GAIN APPLICATION ==========

  /**
   * Sync a gain value to the corresponding Web Audio GainNode.
   * Uses setValueAtTime for glitch-free gain changes.
   */
  const syncGainNode = useCallback((audioId: 'A' | 'B', gainLinear: number) => {
    if (!webAudioActiveRef.current || !audioContextRef.current) return;
    const gainNode = audioId === 'A' ? gainNodeARef.current : gainNodeBRef.current;
    if (gainNode) {
      gainNode.gain.setValueAtTime(gainLinear, audioContextRef.current.currentTime);
    }
  }, []);

  /**
   * Apply normalization gain for a track.
   * When audioId is specified, applies only to that element (crossfade).
   * When omitted, applies to both elements (normal playback).
   */
  const applyGain = useCallback((track: Track | null, audioId?: 'A' | 'B') => {
    const { gainLinear } = calculateGain(track);

    if (audioId === 'A') {
      gainARef.current = gainLinear;
      syncGainNode('A', gainLinear);
    } else if (audioId === 'B') {
      gainBRef.current = gainLinear;
      syncGainNode('B', gainLinear);
    } else {
      // Apply to both (non-crossfade playback)
      gainARef.current = gainLinear;
      gainBRef.current = gainLinear;
      currentGainRef.current = gainLinear;
      syncGainNode('A', gainLinear);
      syncGainNode('B', gainLinear);
    }

    applyEffectiveVolume();
  }, [calculateGain, applyEffectiveVolume, syncGainNode]);

  /**
   * Apply gain to a specific audio element only (for crossfade preparation).
   * Sets the GainNode + audio.volume for one element without affecting the other.
   */
  const applyGainToAudio = useCallback((track: Track | null, audioId: 'A' | 'B') => {
    const { gainLinear } = calculateGain(track);
    const { userVolume } = audioElementsRef.current;

    if (audioId === 'A') {
      gainARef.current = gainLinear;
    } else {
      gainBRef.current = gainLinear;
    }

    // Update Web Audio GainNode
    syncGainNode(audioId, gainLinear);

    // Update audio.volume for the specific element
    const audio = audioId === 'A'
      ? audioElementsRef.current.audioA
      : audioElementsRef.current.audioB;
    if (audio) {
      if (webAudioActiveRef.current) {
        audio.volume = userVolume;
      } else {
        audio.volume = Math.min(1, userVolume * gainLinear);
      }
    }
  }, [calculateGain, syncGainNode]);

  /**
   * Swap gains between audio elements (after crossfade completes and audio is switched).
   * Both the ref values and Web Audio GainNode values are swapped.
   */
  const swapGains = useCallback(() => {
    const tempGain = gainARef.current;
    gainARef.current = gainBRef.current;
    gainBRef.current = tempGain;
    currentGainRef.current = gainARef.current;

    // Sync Web Audio GainNodes with swapped values
    syncGainNode('A', gainARef.current);
    syncGainNode('B', gainBRef.current);
  }, [syncGainNode]);

  /**
   * Get current normalization gain
   */
  const getCurrentGain = useCallback(() => {
    return currentGainRef.current;
  }, []);

  // ========== RETURN MEMOIZED API ==========

  // Memoize the return object to prevent unnecessary re-renders and effect re-runs.
  // Without this, PlayerContext's registration effect (which depends on `normalization`)
  // would re-run on every render, calling applyEffectiveVolume() which resets BOTH audio
  // volumes — destroying the crossfade animation.
  return useMemo(() => ({
    // Core API
    registerAudioElements,
    setUserVolume,
    applyGain,
    calculateGain,
    getCurrentGain,

    // Crossfade-aware API
    applyGainToAudio,
    getEffectiveVolume,
    getGainForAudio,
    swapGains,

    // Web Audio API management
    connectAudioElement,
    resumeAudioContext,
    initAudioContext,
  }), [
    registerAudioElements,
    setUserVolume,
    applyGain,
    calculateGain,
    getCurrentGain,
    applyGainToAudio,
    getEffectiveVolume,
    getGainForAudio,
    swapGains,
    connectAudioElement,
    resumeAudioContext,
    initAudioContext,
  ]);
}
