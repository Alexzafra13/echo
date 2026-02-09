import { useRef, useCallback, useMemo } from 'react';
import type { NormalizationSettings } from '../types';
import type { Track } from '@shared/types/track.types';

/**
 * Resultado del cálculo de ganancia
 */
interface GainCalculation {
  gainDb: number; // Ganancia a aplicar en dB
  gainLinear: number; // Ganancia en escala lineal
  wasLimited: boolean; // Si se limitó por peak
}

/**
 * Hook para normalización de audio usando ajuste de volumen directo
 *
 * Implementa normalización estilo Apple Music:
 * - Ajusta el volumen del elemento de audio directamente
 * - Respeta los peaks para evitar clipping (si preventClipping está activado)
 * - Uses Web Audio API GainNodes via volumeSetter for iOS Safari compatibility
 *   (HTMLAudioElement.volume is read-only on iOS)
 *
 * Arquitectura:
 * volume = userVolume * normalizationGain (applied via GainNode or element.volume fallback)
 *
 * Crossfade support:
 * - Separate gains for audioA and audioB to handle crossfade transitions
 * - During crossfade, each audio maintains its own track's gain
 */
export function useAudioNormalization(settings: NormalizationSettings) {
  // Store separate gains for each audio element (for crossfade support)
  const gainARef = useRef<number>(1);
  const gainBRef = useRef<number>(1);
  // Legacy: keep currentGainRef for backwards compatibility
  const currentGainRef = useRef<number>(1);

  // Crossfade guard: when true, applyEffectiveVolume is skipped to prevent
  // resetting the per-element volumes that the crossfade animation controls.
  const isCrossfadingRef = useRef(false);

  // Store reference to audio elements for volume adjustment
  const audioElementsRef = useRef<{
    audioA: HTMLAudioElement | null;
    audioB: HTMLAudioElement | null;
    userVolume: number;
    // Volume setter that goes through Web Audio API GainNodes when available.
    // Falls back to direct element.volume when null (e.g., in tests or when
    // Web Audio API is not supported).
    volumeSetter: ((audioId: 'A' | 'B', volume: number) => void) | null;
  }>({
    audioA: null,
    audioB: null,
    userVolume: 0.7,
    volumeSetter: null,
  });

  /**
   * Internal helper to set volume on a specific audio element.
   * Routes through Web Audio API GainNode when available (iOS Safari),
   * falls back to direct element.volume assignment.
   */
  const setVolumeForAudio = useCallback((audioId: 'A' | 'B', volume: number) => {
    const setter = audioElementsRef.current.volumeSetter;
    if (setter) {
      setter(audioId, volume);
    } else {
      const audio = audioId === 'A'
        ? audioElementsRef.current.audioA
        : audioElementsRef.current.audioB;
      if (audio) audio.volume = volume;
    }
  }, []);

  /**
   * Register audio elements for volume-based normalization.
   * @param volumeSetter - Optional setter that routes volume through Web Audio API GainNodes.
   *   When provided, all volume changes go through GainNodes (required for iOS Safari).
   *   When omitted, falls back to direct element.volume (works on desktop/Android).
   */
  const registerAudioElements = useCallback((
    audioA: HTMLAudioElement | null,
    audioB: HTMLAudioElement | null,
    volumeSetter?: (audioId: 'A' | 'B', volume: number) => void
  ) => {
    audioElementsRef.current.audioA = audioA;
    audioElementsRef.current.audioB = audioB;
    audioElementsRef.current.volumeSetter = volumeSetter ?? null;
  }, []);

  /**
   * Update user volume (called when user changes volume slider)
   */
  const setUserVolume = useCallback((volume: number) => {
    audioElementsRef.current.userVolume = volume;
    // Re-apply the effective volume to both elements with their respective gains
    applyEffectiveVolume();
  }, []);

  /**
   * Notify normalization that a crossfade is starting or ending.
   * While crossfading, applyEffectiveVolume is skipped so the crossfade
   * animation has exclusive control over per-element volumes.
   */
  const setCrossfading = useCallback((value: boolean) => {
    isCrossfadingRef.current = value;
  }, []);

  /**
   * Apply effective volume (userVolume * normalizationGain) to audio elements.
   * Routes through Web Audio API GainNodes when available (iOS Safari compatibility).
   * Each audio element uses its own gain to support crossfade between tracks with different loudness.
   */
  const applyEffectiveVolume = useCallback(() => {
    // During crossfade, the animation loop (requestAnimationFrame) controls
    // per-element volumes via setAudioVolume. Resetting them here would
    // override the fade curves and both tracks would play at full volume.
    if (isCrossfadingRef.current) return;

    const { userVolume } = audioElementsRef.current;

    const effectiveVolumeA = Math.min(1, userVolume * gainARef.current);
    setVolumeForAudio('A', effectiveVolumeA);

    const effectiveVolumeB = Math.min(1, userVolume * gainBRef.current);
    setVolumeForAudio('B', effectiveVolumeB);
  }, [setVolumeForAudio]);

  /**
   * Get effective volume for a specific audio element (for crossfade calculations)
   */
  const getEffectiveVolume = useCallback((audioId: 'A' | 'B'): number => {
    const { userVolume } = audioElementsRef.current;
    const gain = audioId === 'A' ? gainARef.current : gainBRef.current;
    return Math.min(1, userVolume * gain);
  }, []);

  /**
   * Get gain for a specific audio element
   */
  const getGainForAudio = useCallback((audioId: 'A' | 'B'): number => {
    return audioId === 'A' ? gainARef.current : gainBRef.current;
  }, []);

  /**
   * Calcula la ganancia a aplicar para un track
   * Estilo Apple: respetar peaks, no usar limitador
   */
  const calculateGain = useCallback((track: Track | null): GainCalculation => {
    const noGain = { gainDb: 0, gainLinear: 1, wasLimited: false };

    if (!settings.enabled || !track) {
      return noGain;
    }

    // Si no hay datos de ReplayGain, no aplicar normalización
    const rgTrackGain = track.rgTrackGain;
    const rgTrackPeak = track.rgTrackPeak;

    if (rgTrackGain === undefined || rgTrackGain === null) {
      return noGain;
    }

    // Calcular la ganancia base
    // rgTrackGain ya está calculado para -16 LUFS por el backend (LufsAnalyzerService)
    // Si el usuario elige un target diferente, ajustamos
    let gainDb = rgTrackGain;

    // Ajuste si el usuario tiene un target diferente al usado en el análisis
    // Backend usa -16 LUFS (Apple style), usuario puede elegir -14 (Spotify style)
    const ANALYSIS_TARGET_LUFS = -16;
    gainDb = rgTrackGain + (settings.targetLufs - ANALYSIS_TARGET_LUFS);

    let wasLimited = false;

    // Apple Music style: garantizar True Peak ≤ -1 dBTP
    // Esto previene clipping en codecs lossy como AAC
    if (settings.preventClipping && rgTrackPeak !== undefined && rgTrackPeak !== null && rgTrackPeak > 0) {
      // Calcular el headroom disponible hasta -1 dBTP (no hasta 0 dBFS)
      // headroomTo0dB = -20 * log10(peak) → cuántos dB hasta 0 dBFS
      // headroomToMinus1dB = headroomTo0dB - 1.0 → cuántos dB hasta -1 dBTP
      const headroomTo0dB = -20 * Math.log10(rgTrackPeak);
      const TRUE_PEAK_CEILING = -1.0; // Apple requiere True Peak ≤ -1 dBTP
      const maxAllowedGain = headroomTo0dB + TRUE_PEAK_CEILING; // +(-1) = -1

      if (gainDb > maxAllowedGain) {
        gainDb = maxAllowedGain;
        wasLimited = true;
      }
    }

    // For volume-based normalization, we can't boost beyond 1.0
    // So limit positive gain to 0 dB (no boost)
    // This means quiet tracks won't be boosted, but loud tracks will still be reduced
    if (gainDb > 0) {
      gainDb = 0;
      wasLimited = true;
    }

    // Convertir dB a escala lineal: linear = 10^(dB/20)
    const gainLinear = Math.pow(10, gainDb / 20);

    return {
      gainDb,
      gainLinear,
      wasLimited,
    };
  }, [settings.enabled, settings.targetLufs, settings.preventClipping]);

  /**
   * Aplica la ganancia calculada ajustando el volumen del elemento de audio
   * When called without audioId, applies to both elements (for non-crossfade scenarios)
   */
  const applyGain = useCallback((track: Track | null, audioId?: 'A' | 'B') => {
    const { gainLinear } = calculateGain(track);

    if (audioId === 'A') {
      gainARef.current = gainLinear;
    } else if (audioId === 'B') {
      gainBRef.current = gainLinear;
    } else {
      // Apply to both (legacy behavior for non-crossfade playback)
      gainARef.current = gainLinear;
      gainBRef.current = gainLinear;
      currentGainRef.current = gainLinear;
    }

    // Apply effective volume to audio elements
    applyEffectiveVolume();
  }, [calculateGain, applyEffectiveVolume]);

  /**
   * Apply gain only to a specific audio element (for crossfade).
   * Does not affect the other audio element's gain.
   * Routes through Web Audio API GainNodes when available (iOS Safari compatibility).
   */
  const applyGainToAudio = useCallback((track: Track | null, audioId: 'A' | 'B') => {
    const { gainLinear } = calculateGain(track);
    const { userVolume } = audioElementsRef.current;

    if (audioId === 'A') {
      gainARef.current = gainLinear;
    } else {
      gainBRef.current = gainLinear;
    }

    setVolumeForAudio(audioId, Math.min(1, userVolume * gainLinear));
  }, [calculateGain, setVolumeForAudio]);

  /**
   * Swap gains between audio elements (call after crossfade completes and audio is switched)
   */
  const swapGains = useCallback(() => {
    const tempGain = gainARef.current;
    gainARef.current = gainBRef.current;
    gainBRef.current = tempGain;
    currentGainRef.current = gainARef.current;
  }, []);

  /**
   * Get current normalization gain (for external use if needed)
   */
  const getCurrentGain = useCallback(() => {
    return currentGainRef.current;
  }, []);

  // Legacy methods for compatibility (no-ops — Web Audio API is now managed in useAudioElements)
  const resumeAudioContext = useCallback(async () => {
    // No-op: AudioContext is managed by useAudioElements.ensureWebAudio()
  }, []);

  const initAudioContext = useCallback(() => {
    // No-op: AudioContext is managed by useAudioElements.ensureWebAudio()
    return null;
  }, []);

  const connectAudioElement = useCallback((_audioElement: HTMLAudioElement, _audioId: 'A' | 'B') => {
    // No-op: Audio elements are connected to GainNodes in useAudioElements
  }, []);

  // Memoize the return object to prevent unnecessary re-renders and effect re-runs.
  // Without this, PlayerContext's registration effect (which depends on `normalization`)
  // would re-run on every render, calling applyEffectiveVolume() which resets BOTH audio
  // volumes to their effective values — destroying the crossfade animation that carefully
  // sets different volumes on each audio element via requestAnimationFrame.
  return useMemo(() => ({
    // New volume-based API
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
    setCrossfading,

    // Legacy API (for compatibility, now no-ops)
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
    setCrossfading,
    connectAudioElement,
    resumeAudioContext,
    initAudioContext,
  ]);
}
