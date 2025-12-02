import { useRef, useCallback, useEffect } from 'react';
import type { NormalizationSettings } from '../types';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';

/**
 * Resultado del cálculo de ganancia
 */
interface GainCalculation {
  gainDb: number; // Ganancia a aplicar en dB
  gainLinear: number; // Ganancia en escala lineal (para Web Audio API)
  wasLimited: boolean; // Si se limitó por peak
}

/**
 * Hook para normalización de audio usando Web Audio API
 *
 * Implementa normalización estilo Apple Music:
 * - Usa GainNode para ajustar el volumen basándose en ReplayGain
 * - Respeta los peaks para evitar clipping (si preventClipping está activado)
 * - NO usa limitador/compresor (a diferencia de Spotify)
 *
 * Arquitectura:
 * HTMLAudioElement → MediaElementSourceNode → GainNode → AudioContext.destination
 */
export function useAudioNormalization(settings: NormalizationSettings) {
  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeARef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceNodeBRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedAudioARef = useRef<HTMLAudioElement | null>(null);
  const connectedAudioBRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Inicializa el AudioContext (debe llamarse tras interacción del usuario)
   */
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();

      // Crear GainNode
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);

      console.log('[AudioNormalization] ✅ AudioContext initialized, state:', audioContextRef.current.state);
      return audioContextRef.current;
    } catch (error) {
      console.error('[AudioNormalization] ❌ Failed to create AudioContext:', error);
      return null;
    }
  }, []);

  /**
   * Conecta un elemento de audio al grafo de Web Audio API
   */
  const connectAudioElement = useCallback((
    audioElement: HTMLAudioElement,
    audioId: 'A' | 'B'
  ) => {
    const ctx = initAudioContext();
    if (!ctx || !gainNodeRef.current) return;

    // Verificar si ya está conectado
    const connectedRef = audioId === 'A' ? connectedAudioARef : connectedAudioBRef;
    const sourceRef = audioId === 'A' ? sourceNodeARef : sourceNodeBRef;

    if (connectedRef.current === audioElement) {
      return; // Ya conectado
    }

    // Desconectar el anterior si existe
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // Ignorar error si ya estaba desconectado
      }
    }

    try {
      // Crear MediaElementSourceNode
      const source = ctx.createMediaElementSource(audioElement);
      source.connect(gainNodeRef.current);

      sourceRef.current = source;
      connectedRef.current = audioElement;

      console.log(`[AudioNormalization] ✅ Audio ${audioId} connected to gain node`);
    } catch (error) {
      // El elemento podría ya estar conectado a otro contexto
      console.error(`[AudioNormalization] ❌ Could not connect audio ${audioId}:`, error);
    }
  }, [initAudioContext]);

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

    // Estilo Apple: si preventClipping está activado, limitar la ganancia positiva
    if (settings.preventClipping && gainDb > 0 && rgTrackPeak !== undefined && rgTrackPeak !== null) {
      // Calcular el headroom disponible basado en el peak
      // Si peak = 0.9, headroom = -20 * log10(0.9) = ~0.92 dB
      // Si peak = 1.0, headroom = 0 dB (no podemos subir)
      const headroomDb = rgTrackPeak > 0 ? -20 * Math.log10(rgTrackPeak) : 0;

      if (gainDb > headroomDb) {
        gainDb = Math.max(0, headroomDb - 0.5); // Dejar 0.5 dB de margen
        wasLimited = true;
      }
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
   * Aplica la ganancia calculada al GainNode
   */
  const applyGain = useCallback((track: Track | null) => {
    if (!gainNodeRef.current) {
      console.warn('[AudioNormalization] ⚠️ applyGain: GainNode is null, normalization disabled');
      return;
    }

    const { gainDb, gainLinear, wasLimited } = calculateGain(track);

    // Aplicar ganancia suavemente para evitar clicks
    const currentTime = audioContextRef.current?.currentTime ?? 0;
    gainNodeRef.current.gain.setTargetAtTime(gainLinear, currentTime, 0.015);

    console.log(
      `[AudioNormalization] 🎚️ Applied gain: ${gainDb.toFixed(2)} dB (linear: ${gainLinear.toFixed(3)})${wasLimited ? ' [limited by peak]' : ''}`,
      { track: track?.title, rgTrackGain: track?.rgTrackGain, rgTrackPeak: track?.rgTrackPeak, settings }
    );
  }, [calculateGain, settings]);

  /**
   * Initialize and resume AudioContext (requerido tras interacción del usuario)
   * This is the safe entry point to call after a user gesture
   */
  const resumeAudioContext = useCallback(async () => {
    // Initialize AudioContext if not exists (safe after user gesture)
    if (!audioContextRef.current) {
      initAudioContext();
    }

    // Resume if suspended
    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        logger.debug('[AudioNormalization] AudioContext resumed');
      } catch (error) {
        logger.error('[AudioNormalization] Failed to resume AudioContext:', error);
      }
    }
  }, [initAudioContext]);

  // Handle visibility change to resume AudioContext on mobile
  // When phone screen turns off, browser suspends AudioContext to save battery
  // We need to resume it when the app comes back to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          logger.debug('[AudioNormalization] AudioContext resumed after visibility change');
        }).catch((error) => {
          logger.error('[AudioNormalization] Failed to resume AudioContext on visibility change:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    connectAudioElement,
    applyGain,
    calculateGain,
    resumeAudioContext,
    initAudioContext,
  };
}
