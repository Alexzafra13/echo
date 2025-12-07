import { useRef, useCallback } from 'react';
import type { NormalizationSettings } from '../types';
import type { Track } from '@shared/types';

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
 * - NO usa Web Audio API (compatible con reproducción en segundo plano móvil)
 *
 * Arquitectura:
 * HTMLAudioElement.volume = userVolume * normalizationGain
 */
export function useAudioNormalization(settings: NormalizationSettings) {
  // Store current normalization gain (linear scale)
  const currentGainRef = useRef<number>(1);

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
    // Re-apply the effective volume
    applyEffectiveVolume();
  }, []);

  /**
   * Apply effective volume (userVolume * normalizationGain) to audio elements
   */
  const applyEffectiveVolume = useCallback(() => {
    const { audioA, audioB, userVolume } = audioElementsRef.current;
    const effectiveVolume = Math.min(1, userVolume * currentGainRef.current);

    if (audioA) audioA.volume = effectiveVolume;
    if (audioB) audioB.volume = effectiveVolume;
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
   */
  const applyGain = useCallback((track: Track | null) => {
    const { gainLinear } = calculateGain(track);

    // Store the current gain
    currentGainRef.current = gainLinear;

    // Apply effective volume to audio elements
    applyEffectiveVolume();
  }, [calculateGain, applyEffectiveVolume]);

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

  const connectAudioElement = useCallback((_audioElement: HTMLAudioElement, _audioId: 'A' | 'B') => {
    // No-op: We no longer connect to Web Audio API
  }, []);

  return {
    // New volume-based API
    registerAudioElements,
    setUserVolume,
    applyGain,
    calculateGain,
    getCurrentGain,

    // Legacy API (for compatibility, now no-ops)
    connectAudioElement,
    resumeAudioContext,
    initAudioContext,
  };
}
