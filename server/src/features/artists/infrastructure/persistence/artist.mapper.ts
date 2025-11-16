import { Artist } from '../../domain/entities/artist.entity';

/**
 * ArtistMapper - Convierte entre capas
 *
 * Prisma Artist ↔ Domain Artist
 */
export class ArtistMapper {
  /**
   * Convierte Prisma Artist a Domain Artist
   * Se usa cuando traes datos de BD
   */
  static toDomain(raw: any): Artist {
    return Artist.reconstruct({
      id: raw.id,
      name: raw.name,
      albumCount: raw.albumCount || 0,
      songCount: raw.songCount || 0,
      mbzArtistId: raw.mbzArtistId || undefined,
      biography: raw.biography || undefined,
      externalUrl: raw.externalUrl || undefined,
      externalInfoUpdatedAt: raw.externalInfoUpdatedAt || undefined,
      orderArtistName: raw.orderArtistName || undefined,
      size: BigInt(raw.size || 0),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convierte Domain Artist a formato Prisma
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
      externalInfoUpdatedAt: primitives.externalInfoUpdatedAt || null,
      orderArtistName: primitives.orderArtistName || null,
      size: primitives.size,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Convierte Array de Prisma Artists a Domain Artists
   */
  static toDomainArray(raw: any[]): Artist[] {
    return raw.map((item) => this.toDomain(item));
  }
}
