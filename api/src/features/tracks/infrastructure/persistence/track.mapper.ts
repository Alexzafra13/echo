import { Track as TrackDb } from '@infrastructure/database/schema/tracks';
import { Track } from '../../domain/entities/track.entity';

/**
 * TrackMapper - Convierte entre capas
 *
 * Drizzle Track ↔ Domain Track
 */
export class TrackMapper {
  /**
   * Convierte Drizzle Track a Domain Track
   * Se usa cuando traes datos de BD
   */
  static toDomain(raw: TrackDb): Track {
    return Track.reconstruct({
      id: raw.id,
      title: raw.title,
      albumId: raw.albumId || undefined,
      artistId: raw.artistId || undefined,
      albumArtistId: raw.albumArtistId || undefined,
      trackNumber: raw.trackNumber || undefined,
      discNumber: raw.discNumber || 1,
      year: raw.year || undefined,
      duration: raw.duration || undefined,
      path: raw.path,
      bitRate: raw.bitRate || undefined,
      size: raw.size ? Number(raw.size) : undefined,
      suffix: raw.suffix || undefined,
      lyrics: raw.lyrics || undefined,
      comment: raw.comment || undefined,
      albumName: raw.albumName || undefined,
      artistName: raw.artistName || undefined,
      albumArtistName: raw.albumArtistName || undefined,
      compilation: raw.compilation || false,
      // ReplayGain / Normalización
      rgTrackGain: raw.rgTrackGain ?? undefined,
      rgTrackPeak: raw.rgTrackPeak ?? undefined,
      rgAlbumGain: raw.rgAlbumGain ?? undefined,
      rgAlbumPeak: raw.rgAlbumPeak ?? undefined,
      // Smart crossfade
      outroStart: raw.outroStart ?? undefined,
      // Missing file tracking
      missingAt: raw.missingAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convierte Domain Track a formato Drizzle
   * Se usa cuando guardas en BD
   */
  static toPersistence(track: Track) {
    const primitives = track.toPrimitives();
    return {
      id: primitives.id,
      title: primitives.title,
      albumId: primitives.albumId || null,
      artistId: primitives.artistId || null,
      albumArtistId: primitives.albumArtistId || null,
      trackNumber: primitives.trackNumber || null,
      discNumber: primitives.discNumber,
      year: primitives.year || null,
      duration: primitives.duration || null,
      path: primitives.path,
      bitRate: primitives.bitRate || null,
      size: primitives.size ? Number(primitives.size) : null,
      suffix: primitives.suffix || null,
      lyrics: primitives.lyrics || null,
      comment: primitives.comment || null,
      albumName: primitives.albumName || null,
      artistName: primitives.artistName || null,
      albumArtistName: primitives.albumArtistName || null,
      compilation: primitives.compilation,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Convierte Array de Drizzle Tracks a Domain Tracks
   */
  static toDomainArray(raw: TrackDb[]): Track[] {
    return raw.map((item) => this.toDomain(item));
  }
}
