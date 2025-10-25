import { Track } from '../../domain/entities/track.entity';

/**
 * TrackMapper - Convierte entre capas
 *
 * Prisma Track ↔ Domain Track
 */
export class TrackMapper {
  /**
   * Convierte Prisma Track a Domain Track
   * Se usa cuando traes datos de BD
   */
  static toDomain(raw: any): Track {
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
      size: raw.size ? BigInt(raw.size) : undefined,
      suffix: raw.suffix || undefined,
      lyrics: raw.lyrics || undefined,
      comment: raw.comment || undefined,
      albumName: raw.albumName || undefined,
      artistName: raw.artistName || undefined,
      albumArtistName: raw.albumArtistName || undefined,
      compilation: raw.compilation || false,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convierte Domain Track a formato Prisma
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
      size: primitives.size || null,
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
   * Convierte Array de Prisma Tracks a Domain Tracks
   */
  static toDomainArray(raw: any[]): Track[] {
    return raw.map((item) => this.toDomain(item));
  }
}
