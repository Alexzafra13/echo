import { Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { tracks } from '@infrastructure/database/schema';

interface TopTrackInput {
  trackId: string;
  playCount: number;
  weightedPlayCount: number;
}

export interface EnrichedTopTrack {
  trackId: string;
  playCount: number;
  weightedPlayCount: number;
  track?: {
    id: string;
    title: string;
    artistName: string | null;
    artistId: string | null;
    albumName: string | null;
    albumId: string | null;
    duration: number | null;
  };
}

/**
 * Enriquece IDs de tracks con metadatos (titulo, artista, album)
 * para endpoints que devuelven estadisticas de reproduccion
 */
@Injectable()
export class TrackEnricherService {
  constructor(private readonly drizzle: DrizzleService) {}

  async enrichTopTracks(topTracks: TopTrackInput[]): Promise<EnrichedTopTrack[]> {
    if (topTracks.length === 0) return [];

    const trackIds = topTracks.map(t => t.trackId);

    const trackRows = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        artistName: tracks.artistName,
        artistId: tracks.artistId,
        albumName: tracks.albumName,
        albumId: tracks.albumId,
        duration: tracks.duration,
      })
      .from(tracks)
      .where(inArray(tracks.id, trackIds));

    const trackMap = new Map(trackRows.map(t => [t.id, t]));

    // Filtrar tracks que ya no existen en la BD
    return topTracks
      .filter(t => trackMap.has(t.trackId))
      .map(t => ({
        trackId: t.trackId,
        playCount: t.playCount,
        weightedPlayCount: t.weightedPlayCount,
        track: trackMap.get(t.trackId)!,
      }));
  }
}
