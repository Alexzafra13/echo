import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { BaseRepository } from '@shared/base';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { ArtistMapper } from './artist.mapper';

@Injectable()
export class PrismaArtistRepository
  extends BaseRepository<Artist>
  implements IArtistRepository
{
  protected readonly mapper = ArtistMapper;
  protected readonly modelDelegate: any;

  constructor(protected readonly prisma: PrismaService) {
    super();
    this.modelDelegate = prisma.artist;
  }

  async findById(id: string): Promise<Artist | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
    });

    return artist ? ArtistMapper.toDomain(artist) : null;
  }

  async findAll(skip: number, take: number): Promise<Artist[]> {
    const artists = await this.prisma.artist.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return ArtistMapper.toDomainArray(artists);
  }

  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    const artists = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM artists
      WHERE name % ${name}
      ORDER BY similarity(name, ${name}) DESC, name ASC
      LIMIT ${take}
      OFFSET ${skip}
    `;

    return ArtistMapper.toDomainArray(artists);
  }

  async count(): Promise<number> {
    return this.prisma.artist.count();
  }

  async create(artist: Artist): Promise<Artist> {
    const persistenceData = ArtistMapper.toPersistence(artist);

    const created = await this.prisma.artist.create({
      data: persistenceData,
    });

    return ArtistMapper.toDomain(created);
  }

  async update(id: string, artist: Partial<Artist>): Promise<Artist | null> {
    const primitives = this.toPrimitives(artist);

    const updateData = this.buildUpdateData(primitives, [
      'name',
      'albumCount',
      'songCount',
      'mbzArtistId',
      'biography',
      'externalUrl',
      'externalInfoUpdatedAt',
      'orderArtistName',
      'size',
    ]);

    const updated = await this.prisma.artist.update({
      where: { id },
      data: updateData,
    });

    return ArtistMapper.toDomain(updated);
  }
}
