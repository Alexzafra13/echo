import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { ArtistMapper } from './artist.mapper';

/**
 * PrismaArtistRepository - Implementación de IArtistRepository con Prisma
 *
 * Implementa los métodos del port IArtistRepository
 * Usa PrismaService para acceder a la BD
 * Usa ArtistMapper para convertir Prisma ↔ Domain
 */
@Injectable()
export class PrismaArtistRepository implements IArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca artista por ID
   */
  async findById(id: string): Promise<Artist | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });

    return artist ? ArtistMapper.toDomain(artist) : null;
  }

  /**
   * Obtiene todos los artistas con paginación
   */
  async findAll(skip: number, take: number): Promise<Artist[]> {
    const artists = await this.prisma.artist.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return ArtistMapper.toDomainArray(artists);
  }

  /**
   * Busca artistas por nombre
   */
  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    const artists = await this.prisma.artist.findMany({
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

    return ArtistMapper.toDomainArray(artists);
  }

  /**
   * Cuenta total de artistas
   */
  async count(): Promise<number> {
    return this.prisma.artist.count();
  }

  /**
   * Crea nuevo artista
   */
  async create(artist: Artist): Promise<Artist> {
    const persistenceData = ArtistMapper.toPersistence(artist);

    const created = await this.prisma.artist.create({
      data: persistenceData,
    });

    return ArtistMapper.toDomain(created);
  }

  /**
   * Actualiza artista
   */
  async update(id: string, artist: Partial<Artist>): Promise<Artist | null> {
    const primitives = artist.toPrimitives ? artist.toPrimitives() : artist;

    const updateData: any = {};
    if (primitives.name) updateData.name = primitives.name;
    if (primitives.albumCount !== undefined) updateData.albumCount = primitives.albumCount;
    if (primitives.songCount !== undefined) updateData.songCount = primitives.songCount;
    if (primitives.mbzArtistId !== undefined) updateData.mbzArtistId = primitives.mbzArtistId;
    if (primitives.biography !== undefined) updateData.biography = primitives.biography;
    if (primitives.smallImageUrl !== undefined) updateData.smallImageUrl = primitives.smallImageUrl;
    if (primitives.mediumImageUrl !== undefined) updateData.mediumImageUrl = primitives.mediumImageUrl;
    if (primitives.largeImageUrl !== undefined) updateData.largeImageUrl = primitives.largeImageUrl;
    if (primitives.externalUrl !== undefined) updateData.externalUrl = primitives.externalUrl;
    if (primitives.externalInfoUpdatedAt !== undefined) updateData.externalInfoUpdatedAt = primitives.externalInfoUpdatedAt;
    if (primitives.orderArtistName !== undefined) updateData.orderArtistName = primitives.orderArtistName;
    if (primitives.size !== undefined) updateData.size = primitives.size;

    const updated = await this.prisma.artist.update({
      where: { id },
      data: updateData,
    });

    return ArtistMapper.toDomain(updated);
  }

  /**
   * Elimina artista
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.artist.delete({
      where: { id },
    }).catch(() => null);

    return result !== null;
  }
}
