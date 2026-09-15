import type { Track } from '../types';

// Cambio de velocidad máximo que se aplica al ajustar el tempo (±6 %, como un
// pitch fader de DJ). Más allá se nota demasiado y no se ajusta.
export const MAX_TEMPO_CHANGE = 0.06;

type TempoSource = Pick<Track, 'bpm'> | null | undefined;

function hasBpm(track: TempoSource): track is { bpm: number } {
  return !!track && typeof track.bpm === 'number' && Number.isFinite(track.bpm) && track.bpm > 0;
}

/**
 * Relación de velocidad (playbackRate) que hay que aplicar a la pista saliente
 * para que su tempo coincida con el de la entrante. Devuelve undefined si falta
 * el BPM de alguna o si la diferencia supera el máximo permitido.
 *
 * Los tempos a mitad o doble (80 vs 160 BPM) se consideran equivalentes.
 */
export function getTempoRatio(from: TempoSource, to: TempoSource): number | undefined {
  if (!hasBpm(from) || !hasBpm(to)) return undefined;

  let ratio = to.bpm / from.bpm;
  if (ratio > 1.5) ratio /= 2;
  else if (ratio < 0.75) ratio *= 2;

  if (Math.abs(ratio - 1) > MAX_TEMPO_CHANGE) return undefined;
  return ratio;
}
