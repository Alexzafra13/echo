/**
 * Track Types - Tipos para canciones/tracks
 */

export interface Track {
  id: string;
  title: string;
  albumId?: string;
  artistId?: string;
  albumArtistId?: string;
  trackNumber?: number;
  discNumber: number;
  year?: number;
  duration?: number; // in seconds
  path: string;
  bitRate?: number;
  size?: number;
  suffix?: string;
  lyrics?: string;
  comment?: string;
  albumName?: string;
  artistName?: string;
  albumArtistName?: string;
  compilation: boolean;
  playlistOrder?: number; // Order in playlist (when track is from a playlist)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper para formatear duración en minutos:segundos
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
