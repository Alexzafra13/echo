import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { TrackMapper } from './track.mapper';

/**
 * PrismaTrackRepository - Implementación de ITrackRepository con Prisma
 *
 * Implementa los métodos del port ITrackRepository
 * Usa PrismaService para acceder a la BD
 * Usa TrackMapper para convertir Prisma ↔ Domain
 */
@Injectable()
export class PrismaTrackRepository implements ITrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca track por ID
   */
  async findById(id: string): Promise<Track | null> {
    const track = await this.prisma.track.findUnique({
      where: { id },
    });

    return track ? TrackMapper.toDomain(track) : null;
  }

  /**
   * Obtiene todos los tracks con paginación
   */
  async findAll(skip: number, take: number): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return TrackMapper.toDomainArray(tracks);
  }

  /**
   * Busca tracks por título usando trigram similarity para búsqueda rápida
   * Requiere extensión pg_trgm y índice GIN (ver migración 20251117030000)
   *
   * La búsqueda por trigram similarity es 10-100x más rápida que ILIKE '%query%'
   * porque utiliza el índice GIN en lugar de hacer full table scan
   */
  async search(title: string, skip: number, take: number): Promise<Track[]> {
    // Usar búsqueda por similaridad de trigram para mejor rendimiento
    // El operador % usa el índice GIN creado en la migración
    const tracks = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM tracks
      WHERE title % ${title}
      ORDER BY similarity(title, ${title}) DESC, title ASC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    return TrackMapper.toDomainArray(tracks);
  }

  /**
   * Obtiene tracks de un álbum
   */
  async findByAlbumId(albumId: string): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: { albumId },
      orderBy: [
        { discNumber: 'asc' },
        { trackNumber: 'asc' },
      ],
    });

    return TrackMapper.toDomainArray(tracks);
  }

  /**
   * Obtiene tracks de un artista con paginación
   */
  async findByArtistId(artistId: string, skip: number, take: number): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: {
        OR: [
          { artistId },
          { albumArtistId: artistId },
        ],
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return TrackMapper.toDomainArray(tracks);
  }

  /**
   * Cuenta total de tracks
   */
  async count(): Promise<number> {
    return this.prisma.track.count();
  }

  /**
   * Crea nuevo track
   */
  async create(track: Track): Promise<Track> {
    const persistenceData = TrackMapper.toPersistence(track);

    const created = await this.prisma.track.create({
      data: persistenceData,
    });

    return TrackMapper.toDomain(created);
  }

  /**
   * Actualiza track
   */
  async update(id: string, track: Partial<Track>): Promise<Track | null> {
    const primitives = track.toPrimitives ? track.toPrimitives() : track;

    const updateData: any = {};
    if (primitives.title) updateData.title = primitives.title;
    if (primitives.albumId !== undefined) updateData.albumId = primitives.albumId;
    if (primitives.artistId !== undefined) updateData.artistId = primitives.artistId;
    if (primitives.albumArtistId !== undefined) updateData.albumArtistId = primitives.albumArtistId;
    if (primitives.trackNumber !== undefined) updateData.trackNumber = primitives.trackNumber;
    if (primitives.discNumber !== undefined) updateData.discNumber = primitives.discNumber;
    if (primitives.year !== undefined) updateData.year = primitives.year;
    if (primitives.duration !== undefined) updateData.duration = primitives.duration;
    if (primitives.path) updateData.path = primitives.path;
    if (primitives.bitRate !== undefined) updateData.bitRate = primitives.bitRate;
    if (primitives.size !== undefined) updateData.size = primitives.size;
    if (primitives.suffix !== undefined) updateData.suffix = primitives.suffix;
    if (primitives.lyrics !== undefined) updateData.lyrics = primitives.lyrics;
    if (primitives.comment !== undefined) updateData.comment = primitives.comment;
    if (primitives.albumName !== undefined) updateData.albumName = primitives.albumName;
    if (primitives.artistName !== undefined) updateData.artistName = primitives.artistName;
    if (primitives.albumArtistName !== undefined) updateData.albumArtistName = primitives.albumArtistName;
    if (primitives.compilation !== undefined) updateData.compilation = primitives.compilation;

    const updated = await this.prisma.track.update({
      where: { id },
      data: updateData,
    });

    return TrackMapper.toDomain(updated);
  }

  /**
   * Elimina track
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.track.delete({
      where: { id },
    }).catch(() => null);

    return result !== null;
  }
}
