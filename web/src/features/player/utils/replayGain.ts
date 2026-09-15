import type { Track } from '../types';

// Por debajo de esto una pista muy alta quedaría prácticamente inaudible
const MIN_MULTIPLIER = 0.1;

type GainSource = Pick<Track, 'rgTrackGain' | 'rgAlbumGain'> | null | undefined;

/**
 * Multiplicador de volumen (0-1) que iguala la sonoridad de la pista con el
 * resto de la biblioteca a partir de la ganancia calculada por el análisis LUFS.
 *
 * Sin Web Audio API solo se puede atenuar: las pistas que necesitarían
 * amplificación se quedan en 1.0.
 *
 * preferAlbumGain: al escuchar un álbum entero se usa la ganancia del álbum,
 * que conserva las diferencias de volumen entre sus pistas.
 */
export function getTrackGainMultiplier(
  track: GainSource,
  enabled: boolean,
  preferAlbumGain: boolean = false
): number {
  if (!enabled || !track) return 1;

  const gainDb = preferAlbumGain
    ? (track.rgAlbumGain ?? track.rgTrackGain)
    : (track.rgTrackGain ?? track.rgAlbumGain);
  if (gainDb === undefined || gainDb === null || !Number.isFinite(gainDb)) return 1;

  const multiplier = Math.pow(10, gainDb / 20);
  return Math.min(1, Math.max(MIN_MULTIPLIER, multiplier));
}
