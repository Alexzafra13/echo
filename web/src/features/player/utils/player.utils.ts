import type { Track } from '@shared/types';
import type { RadioStation } from '@shared/types';

/**
 * Información de visualización para el reproductor
 */
export interface PlayerDisplayInfo {
  title: string;
  artist: string;
  cover: string;
  albumId?: string;
  albumName?: string;
  artistId?: string;
}

/**
 * Extrae la información de visualización para el reproductor
 * Funciona tanto para tracks como para estaciones de radio
 *
 * @param isRadioMode - Si está en modo radio
 * @param currentRadioStation - Estación de radio actual
 * @param currentTrack - Track actual
 * @returns Información formateada para mostrar
 */
export function getPlayerDisplayInfo(
  isRadioMode: boolean,
  currentRadioStation: RadioStation | null,
  currentTrack: Track | null
): PlayerDisplayInfo {
  if (isRadioMode && currentRadioStation) {
    // Handle tags safely - can be null, empty string, or valid string
    const firstTag = currentRadioStation.tags && typeof currentRadioStation.tags === 'string' && currentRadioStation.tags.trim()
      ? currentRadioStation.tags.split(',')[0]
      : null;

    return {
      title: currentRadioStation.name,
      artist: [
        currentRadioStation.country,
        firstTag
      ].filter(Boolean).join(' • ') || 'Radio',
      cover: currentRadioStation.favicon || '/images/covers/placeholder.jpg'
    };
  }

  return {
    title: currentTrack?.title || '',
    artist: currentTrack?.artist || currentTrack?.artistName || '',
    cover: currentTrack?.coverImage || '/images/covers/placeholder.jpg',
    albumId: currentTrack?.albumId || currentTrack?.album?.id,
    albumName: currentTrack?.albumName || currentTrack?.album?.title,
    artistId: currentTrack?.artistId
  };
}
