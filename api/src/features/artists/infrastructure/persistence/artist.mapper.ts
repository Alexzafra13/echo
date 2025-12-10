import { Artist as ArtistDb } from '@infrastructure/database/schema/artists';
import { Artist } from '../../domain/entities/artist.entity';

/**
 * ArtistMapper - Convierte entre capas
 *
 * Drizzle Artist ↔ Domain Artist
 */
export class ArtistMapper {
  /**
   * Convierte Drizzle Artist a Domain Artist
   * Se usa cuando traes datos de BD
   */
  static toDomain(raw: ArtistDb): Artist {
    return Artist.reconstruct({
      id: raw.id,
      name: raw.name,
      albumCount: raw.albumCount || 0,
      songCount: raw.songCount || 0,
      playCount: Number(raw.playCount || 0),
      mbzArtistId: raw.mbzArtistId || undefined,
      biography: raw.biography || undefined,
      externalUrl: raw.externalUrl || undefined,
      externalInfoUpdatedAt: raw.externalProfileUpdatedAt || undefined,
      orderArtistName: raw.orderArtistName || undefined,
      size: Number(raw.size || 0),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convierte Domain Artist a formato Drizzle
   * Se usa cuando guardas en BD
   */
  static toPersistence(artist: Artist) {
    const primitives = artist.toPrimitives();
    return {
      id: primitives.id,
      name: primitives.name,
      albumCount: primitives.albumCount,
      songCount: primitives.songCount,
      mbzArtistId: primitives.mbzArtistId || null,
      biography: primitives.biography || null,
      externalUrl: primitives.externalUrl || null,
      externalProfileUpdatedAt: primitives.externalInfoUpdatedAt || null,
      orderArtistName: primitives.orderArtistName || null,
      size: primitives.size,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Convierte Array de Drizzle Artists a Domain Artists
   */
  static toDomainArray(raw: ArtistDb[]): Artist[] {
    return raw.map((item) => this.toDomain(item));
  }
}
