import { Album as AlbumDb } from '@infrastructure/database/schema/albums';
import { Album } from '../../domain/entities/album.entity';

type AlbumWithRelations = AlbumDb & {
  artist?: { name: string } | null;
};

export class AlbumMapper {
  static toDomain(raw: AlbumWithRelations): Album {
    return Album.reconstruct({
      id: raw.id,
      name: raw.name,
      artistId: raw.artistId || undefined,
      artistName: raw.artist?.name || undefined,
      albumArtistId: raw.albumArtistId || undefined,
      coverArtPath: raw.coverArtPath || undefined,
      year: raw.year || undefined,
      releaseDate: raw.releaseDate ? new Date(raw.releaseDate) : undefined,
      compilation: raw.compilation || false,
      songCount: raw.songCount || 0,
      duration: raw.duration || 0,
      size: Number(raw.size || 0),
      description: raw.description || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(album: Album) {
    const primitives = album.toPrimitives();
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

  static toDomainArray(raw: AlbumWithRelations[]): Album[] {
    return raw.map((item) => this.toDomain(item));
  }
}
