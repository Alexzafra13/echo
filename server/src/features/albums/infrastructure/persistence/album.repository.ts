import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { AlbumMapper } from './album.mapper';

/**
 * PrismaAlbumRepository - Implementación de IAlbumRepository con Prisma
 *
 * Implementa los métodos del port IAlbumRepository
 * Usa PrismaService para acceder a la BD
 * Usa AlbumMapper para convertir Prisma ↔ Domain
 */
@Injectable()
export class PrismaAlbumRepository implements IAlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca álbum por ID
   */
  async findById(id: string): Promise<Album | null> {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: true, // Include artist relation to get artist name
      },
    });

    return album ? AlbumMapper.toDomain(album) : null;
  }

  /**
   * Obtiene todos los álbumes con paginación
   */
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

  /**
   * Busca álbumes por nombre usando trigram similarity para búsqueda rápida
   * Requiere extensión pg_trgm y índice GIN (ver migración 20251117030000)
   *
   * La búsqueda por trigram similarity es 10-100x más rápida que ILIKE '%query%'
   */
  async search(name: string, skip: number, take: number): Promise<Album[]> {
    // Primero obtenemos los IDs usando trigram similarity (muy rápido con índice GIN)
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

    // Luego obtenemos los álbumes completos con relaciones
    const albums = await this.prisma.album.findMany({
      where: {
        id: { in: albumIds.map((a) => a.id) },
      },
      include: {
        artist: true,
      },
    });

    // Mantener el orden de similaridad
    const albumMap = new Map(albums.map((a) => [a.id, a]));
    const orderedAlbums = albumIds.map((id) => albumMap.get(id.id)).filter(Boolean) as any[];

    return AlbumMapper.toDomainArray(orderedAlbums);
  }

  /**
   * Obtiene álbumes de un artista
   */
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

  /**
   * Obtiene álbumes recientes
   */
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

  /**
   * Obtiene álbumes más reproducidos
   */
  async findMostPlayed(take: number): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      take,
      orderBy: { songCount: 'desc' },
      include: {
        artist: true, // Include artist relation to get artist name
      },
    });

    return AlbumMapper.toDomainArray(albums);
  }

  /**
   * Cuenta total de álbumes
   */
  async count(): Promise<number> {
    return this.prisma.album.count();
  }

  /**
   * Crea nuevo álbum
   */
  async create(album: Album): Promise<Album> {
    const persistenceData = AlbumMapper.toPersistence(album);

    const created = await this.prisma.album.create({
      data: persistenceData,
    });

    return AlbumMapper.toDomain(created);
  }

  /**
   * Actualiza álbum
   */
  async update(id: string, album: Partial<Album>): Promise<Album | null> {
    const primitives = album.toPrimitives ? album.toPrimitives() : album;

    const updateData: any = {};
    if (primitives.name) updateData.name = primitives.name;
    if (primitives.artistId !== undefined) updateData.artistId = primitives.artistId;
    if (primitives.albumArtistId !== undefined) updateData.albumArtistId = primitives.albumArtistId;
    if (primitives.coverArtPath !== undefined) updateData.coverArtPath = primitives.coverArtPath;
    if (primitives.year !== undefined) updateData.year = primitives.year;
    if (primitives.releaseDate !== undefined) updateData.releaseDate = primitives.releaseDate;
    if (primitives.compilation !== undefined) updateData.compilation = primitives.compilation;
    if (primitives.songCount !== undefined) updateData.songCount = primitives.songCount;
    if (primitives.duration !== undefined) updateData.duration = primitives.duration;
    if (primitives.size !== undefined) updateData.size = primitives.size;
    if (primitives.description !== undefined) updateData.description = primitives.description;

    const updated = await this.prisma.album.update({
      where: { id },
      data: updateData,
    });

    return AlbumMapper.toDomain(updated);
  }

  /**
   * Elimina álbum
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.album.delete({
      where: { id },
    }).catch(() => null);

    return result !== null;
  }
}