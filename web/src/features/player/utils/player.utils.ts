import type { Track } from '@shared/types/track.types';
import type { RadioStation } from '@shared/types/radio.types';

export interface PlayerDisplayInfo {
  title: string;
  artist: string;
  cover: string;
  albumId?: string;
  albumName?: string;
  artistId?: string;
}

// Extrae info de visualización para tracks o estaciones de radio
export function getPlayerDisplayInfo(
  isRadioMode: boolean,
  currentRadioStation: RadioStation | null,
  currentTrack: Track | null
): PlayerDisplayInfo {
  if (isRadioMode && currentRadioStation) {
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
