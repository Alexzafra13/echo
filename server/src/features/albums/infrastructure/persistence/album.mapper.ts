import { Album } from '../../domain/entities/album.entity';

/**
 * AlbumMapper - Convierte entre capas
 *
 * Prisma Album ↔ Domain Album
 */
export class AlbumMapper {
  /**
   * Convierte Prisma Album a Domain Album
   * Se usa cuando traes datos de BD
   */
  static toDomain(raw: any): Album {
    return Album.reconstruct({
      id: raw.id,
      name: raw.name,
      artistId: raw.artistId || undefined,
      artistName: raw.artist?.name || undefined, // Extract artist name from relation
      albumArtistId: raw.albumArtistId || undefined,
      coverArtPath: raw.coverArtPath || undefined,
      year: raw.year || undefined,
      releaseDate: raw.releaseDate || undefined,
      compilation: raw.compilation || false,
      songCount: raw.songCount || 0,
      duration: raw.duration || 0,
      size: BigInt(raw.size || 0),
      description: raw.description || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convierte Domain Album a formato Prisma
   * Se usa cuando guardas en BD
   */
  static toPersistence(album: Album) {
    const primitives = album.toPrimitives();
    // Convert Date to ISO string for Drizzle date column
    const releaseDate = primitives.releaseDate
      ? (primitives.releaseDate instanceof Date
          ? primitives.releaseDate.toISOString().split('T')[0]
          : primitives.releaseDate)
      : null;
    return {
      id: primitives.id,
      name: primitives.name,
      artistId: primitives.artistId || null,
      albumArtistId: primitives.albumArtistId || null,
      coverArtPath: primitives.coverArtPath || null,
      year: primitives.year || null,
      releaseDate,
      compilation: primitives.compilation,
      songCount: primitives.songCount,
      duration: primitives.duration,
      size: primitives.size,
      description: primitives.description || null,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }

  /**
   * Convierte Array de Prisma Albums a Domain Albums
   */
  static toDomainArray(raw: any[]): Album[] {
    return raw.map((item) => this.toDomain(item));
  }
}