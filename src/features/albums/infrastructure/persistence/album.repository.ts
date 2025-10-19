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
    });

    return AlbumMapper.toDomainArray(albums);
  }

  /**
   * Busca álbumes por nombre
   */
  async search(name: string, skip: number, take: number): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      skip,
      take,
      orderBy: { name: 'asc' },
    });

    return AlbumMapper.toDomainArray(albums);
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