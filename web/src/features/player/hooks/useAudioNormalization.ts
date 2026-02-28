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

interface UseAudioNormalizationOptions {
  /** Volume setter that routes through Web Audio GainNode when available.
   *  When provided, normalization uses this instead of direct audio.volume
   *  manipulation, enabling volume control on iOS Safari where audio.volume
   *  is read-only. Falls back to direct audio.volume if not provided. */
  setAudioVolume?: (audioId: 'A' | 'B', volume: number) => void;
}

/**
 * Hook para normalización de audio usando ajuste de volumen directo
 *
 * Implementa normalización estilo Apple Music:
 * - Ajusta el volumen del elemento de audio directamente
 * - Respeta los peaks para evitar clipping (si preventClipping está activado)
 * - Uses Web Audio GainNode when setAudioVolume callback is provided
 *   (enables volume control on iOS Safari where audio.volume is read-only)
 *
 * Arquitectura:
 * GainNode.gain.value = userVolume * normalizationGain (when Web Audio available)
 * HTMLAudioElement.volume = userVolume * normalizationGain (fallback)
 *
 * Crossfade support:
 * - Separate gains for audioA and audioB to handle crossfade transitions
 * - During crossfade, each audio maintains its own track's gain
 */
export function useAudioNormalization(
  settings: NormalizationSettings,
  options?: UseAudioNormalizationOptions
) {
  // Store separate gains for each audio element (for crossfade support)
  const gainARef = useRef<number>(1);
  const gainBRef = useRef<number>(1);
  // Legacy: keep currentGainRef for backwards compatibility
  const currentGainRef = useRef<number>(1);

  // Crossfade guard: when true, applyEffectiveVolume is skipped to prevent
  // resetting the per-element volumes that the crossfade animation controls.
  const isCrossfadingRef = useRef(false);

  // Store setAudioVolume callback in ref to avoid stale closures.
  // When provided, volume is set through Web Audio GainNode (works on iOS).
  const setAudioVolumeRef = useRef(options?.setAudioVolume);
  setAudioVolumeRef.current = options?.setAudioVolume;

  // Store reference to audio elements for volume adjustment
  const audioElementsRef = useRef<{
    audioA: HTMLAudioElement | null;
    audioB: HTMLAudioElement | null;
    userVolume: number;
  }>({
    audioA: null,
    audioB: null,
    userVolume: 0.7,
  });

  /**
   * Register audio elements for volume-based normalization
   */
  const registerAudioElements = useCallback(
    (audioA: HTMLAudioElement | null, audioB: HTMLAudioElement | null) => {
      audioElementsRef.current.audioA = audioA;
      audioElementsRef.current.audioB = audioB;
    },
    []
  );

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
   * Uses setAudioVolume callback (Web Audio GainNode) when available,
   * falls back to direct audio.volume manipulation.
   */
  const applyEffectiveVolume = useCallback(() => {
    // During crossfade, the animation loop (requestAnimationFrame) controls
    // per-element volumes via setAudioVolume. Resetting them here would
    // override the fade curves and both tracks would play at full volume.
    if (isCrossfadingRef.current) return;

    const { audioA, audioB, userVolume } = audioElementsRef.current;
    const setVol = setAudioVolumeRef.current;

    const effectiveVolumeA = Math.min(1, userVolume * gainARef.current);
    const effectiveVolumeB = Math.min(1, userVolume * gainBRef.current);

    if (setVol) {
      // Use Web Audio GainNode (works on iOS Safari)
      setVol('A', effectiveVolumeA);
      setVol('B', effectiveVolumeB);
    } else {
      // Fallback: direct audio.volume (doesn't work on iOS Safari)
      if (audioA) audioA.volume = effectiveVolumeA;
      if (audioB) audioB.volume = effectiveVolumeB;
    }
  }, []);

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
  const calculateGain = useCallback(
    (track: Track | null): GainCalculation => {
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
      if (
        settings.preventClipping &&
        rgTrackPeak !== undefined &&
        rgTrackPeak !== null &&
        rgTrackPeak > 0
      ) {
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
    },
    [settings.enabled, settings.targetLufs, settings.preventClipping]
  );

  /**
   * Aplica la ganancia calculada ajustando el volumen del elemento de audio
   * When called without audioId, applies to both elements (for non-crossfade scenarios)
   */
  const applyGain = useCallback(
    (track: Track | null, audioId?: 'A' | 'B') => {
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
    },
    [calculateGain, applyEffectiveVolume]
  );

  /**
   * Apply gain only to a specific audio element (for crossfade).
   * Does not affect the other audio element's gain.
   * Uses setAudioVolume callback (Web Audio GainNode) when available.
   */
  const applyGainToAudio = useCallback(
    (track: Track | null, audioId: 'A' | 'B') => {
      const { gainLinear } = calculateGain(track);
      const { audioA, audioB, userVolume } = audioElementsRef.current;
      const setVol = setAudioVolumeRef.current;
      const effectiveVolume = Math.min(1, userVolume * gainLinear);

      if (audioId === 'A') {
        gainARef.current = gainLinear;
        if (setVol) {
          setVol('A', effectiveVolume);
        } else if (audioA) {
          audioA.volume = effectiveVolume;
        }
      } else {
        gainBRef.current = gainLinear;
        if (setVol) {
          setVol('B', effectiveVolume);
        } else if (audioB) {
          audioB.volume = effectiveVolume;
        }
      }
    },
    [calculateGain]
  );

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

  // Legacy methods for compatibility (no-ops now)
  const resumeAudioContext = useCallback(async () => {
    // No-op: We no longer use AudioContext
  }, []);

  const initAudioContext = useCallback(() => {
    // No-op: We no longer use AudioContext
    return null;
  }, []);

  const connectAudioElement = useCallback(
    (_audioElement: HTMLAudioElement, _audioId: 'A' | 'B') => {
      // No-op: We no longer connect to Web Audio API
    },
    []
  );

  // Memoize the return object to prevent unnecessary re-renders and effect re-runs.
  // Without this, PlayerContext's registration effect (which depends on `normalization`)
  // would re-run on every render, calling applyEffectiveVolume() which resets BOTH audio
  // volumes to their effective values — destroying the crossfade animation that carefully
  // sets different volumes on each audio element via requestAnimationFrame.
  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
}
