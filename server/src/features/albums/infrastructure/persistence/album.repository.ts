import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { BaseRepository } from '@shared/base';
import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { AlbumMapper } from './album.mapper';

@Injectable()
export class PrismaAlbumRepository
  extends BaseRepository<Album>
  implements IAlbumRepository
{
  protected readonly mapper = AlbumMapper;
  protected readonly modelDelegate: any;

  constructor(protected readonly prisma: PrismaService) {
    super();
    this.modelDelegate = prisma.album;
  }

  async findById(id: string): Promise<Album | null> {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: true, // Include artist relation to get artist name
      },
    });

    return album ? AlbumMapper.toDomain(album) : null;
  }

  async findAll(skip: number, take: number): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        artist: true, // Include artist relation to get artist name
      },
    });

    return AlbumMapper.toDomainArray(albums);
  }

  async search(name: string, skip: number, take: number): Promise<Album[]> {
    const albumIds = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM albums
      WHERE title % ${name}
      ORDER BY similarity(title, ${name}) DESC, title ASC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    if (albumIds.length === 0) {
      return [];
    }

    const albums = await this.prisma.album.findMany({
      where: {
        id: { in: albumIds.map((a) => a.id) },
      },
      include: {
        artist: true,
      },
    });

    const albumMap = new Map(albums.map((a) => [a.id, a]));
    const orderedAlbums = albumIds
      .map((id) => albumMap.get(id.id))
      .filter((album): album is typeof albums[0] => album !== undefined);

    return AlbumMapper.toDomainArray(orderedAlbums);
  }

  async findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      where: {
        OR: [{ artistId }, { albumArtistId: artistId }],
      },
      skip,
      take,
      orderBy: { year: 'desc' },
      include: {
        artist: true, // Include artist relation to get artist name
      },
    });

    return AlbumMapper.toDomainArray(albums);
  }

  async findRecent(take: number): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        artist: true, // Include artist relation to get artist name
      },
    });

    return AlbumMapper.toDomainArray(albums);
  }

  async findMostPlayed(take: number): Promise<Album[]> {
    const topAlbumIds = await this.prisma.$queryRaw<
      { albumId: string; totalPlayCount: bigint }[]
    >`
      SELECT item_id as "albumId", SUM(play_count) as "totalPlayCount"
      FROM user_play_stats
      WHERE item_type = 'album'
      GROUP BY item_id
      ORDER BY "totalPlayCount" DESC
      LIMIT ${take}
    `;

    if (topAlbumIds.length === 0) {
      return this.findRecent(take);
    }

    const albums = await this.prisma.album.findMany({
      where: {
        id: { in: topAlbumIds.map((a) => a.albumId) },
      },
      include: {
        artist: true,
      },
    });

    const albumMap = new Map(albums.map((a) => [a.id, a]));
    const orderedAlbums = topAlbumIds
      .map((item) => albumMap.get(item.albumId))
      .filter((album): album is typeof albums[0] => album !== undefined);

    return AlbumMapper.toDomainArray(orderedAlbums);
  }

  async findAlphabetically(skip: number, take: number): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      skip,
      take,
      orderBy: {
        orderAlbumName: 'asc', // Usa orderAlbumName (sin acentos, ignora "The")
      },
      include: {
        artist: true,
      },
    });

    return AlbumMapper.toDomainArray(albums);
  }

  async findRecentlyPlayed(userId: string, take: number): Promise<Album[]> {
    // Query SQL: Obtener álbumes más recientes del historial del usuario
    const recentAlbumIds = await this.prisma.$queryRaw<
      { albumId: string; lastPlayed: Date }[]
    >`
      SELECT DISTINCT
        t.album_id as "albumId",
        MAX(ph.played_at) as "lastPlayed"
      FROM play_history ph
      JOIN tracks t ON t.id = ph.track_id
      WHERE ph.user_id = ${userId}
        AND t.album_id IS NOT NULL
      GROUP BY t.album_id
      ORDER BY "lastPlayed" DESC
      LIMIT ${take}
    `;

    if (recentAlbumIds.length === 0) {
      return [];
    }

    // Obtener los álbumes completos
    const albums = await this.prisma.album.findMany({
      where: {
        id: { in: recentAlbumIds.map((a) => a.albumId) },
      },
      include: {
        artist: true,
      },
    });

    // Mantener el orden por fecha de reproducción
    const albumMap = new Map(albums.map((a) => [a.id, a]));
    const orderedAlbums = recentAlbumIds
      .map((item) => albumMap.get(item.albumId))
      .filter((album): album is typeof albums[0] => album !== undefined);

    return AlbumMapper.toDomainArray(orderedAlbums);
  }

  async findFavorites(userId: string, skip: number, take: number): Promise<Album[]> {
    // Query: Álbumes con 'like' en user_starred
    const favoriteAlbumIds = await this.prisma.userStarred.findMany({
      where: {
        userId,
        starredType: 'album',
        sentiment: 'like', // Solo los que tienen like (no dislike)
      },
      orderBy: {
        starredAt: 'desc', // Más recientes primero
      },
      skip,
      take,
      select: {
        starredId: true,
      },
    });

    if (favoriteAlbumIds.length === 0) {
      return [];
    }

    const albums = await this.prisma.album.findMany({
      where: {
        id: { in: favoriteAlbumIds.map((f) => f.starredId) },
      },
      include: {
        artist: true,
      },
    });

    // Mantener orden por fecha de like
    const albumMap = new Map(albums.map((a) => [a.id, a]));
    const orderedAlbums = favoriteAlbumIds
      .map((f) => albumMap.get(f.starredId))
      .filter((album): album is typeof albums[0] => album !== undefined);

    return AlbumMapper.toDomainArray(orderedAlbums);
  }

  async count(): Promise<number> {
    return this.prisma.album.count();
  }

  async create(album: Album): Promise<Album> {
    const persistenceData = AlbumMapper.toPersistence(album);

    const created = await this.prisma.album.create({
      data: persistenceData,
    });

    return AlbumMapper.toDomain(created);
  }

  async update(id: string, album: Partial<Album>): Promise<Album | null> {
    const primitives = this.toPrimitives(album);

    const updateData = this.buildUpdateData(primitives, [
      'name',
      'artistId',
      'albumArtistId',
      'coverArtPath',
      'year',
      'releaseDate',
      'compilation',
      'songCount',
      'duration',
      'size',
      'description',
    ]);

    const updated = await this.prisma.album.update({
      where: { id },
      data: updateData,
    });

    return AlbumMapper.toDomain(updated);
  }
}