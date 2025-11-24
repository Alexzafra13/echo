import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { BaseRepository } from '@shared/base';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { TrackMapper } from './track.mapper';

@Injectable()
export class PrismaTrackRepository
  extends BaseRepository<Track>
  implements ITrackRepository
{
  protected readonly mapper = TrackMapper;
  protected readonly modelDelegate: any;

  constructor(protected readonly prisma: PrismaService) {
    super();
    this.modelDelegate = prisma.track;
  }

  async findById(id: string): Promise<Track | null> {
    const track = await this.prisma.track.findUnique({
      where: { id },
    });

    return track ? TrackMapper.toDomain(track) : null;
  }

  async findByIds(ids: string[]): Promise<Track[]> {
    if (ids.length === 0) {
      return [];
    }

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: ids } },
    });

    return TrackMapper.toDomainArray(tracks);
  }

  async findAll(skip: number, take: number): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return TrackMapper.toDomainArray(tracks);
  }

  async search(title: string, skip: number, take: number): Promise<Track[]> {
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

  async count(): Promise<number> {
    return this.prisma.track.count();
  }

  async create(track: Track): Promise<Track> {
    const persistenceData = TrackMapper.toPersistence(track);

    const created = await this.prisma.track.create({
      data: persistenceData,
    });

    return TrackMapper.toDomain(created);
  }

  async update(id: string, track: Partial<Track>): Promise<Track | null> {
    const primitives = this.toPrimitives(track);

    const updateData = this.buildUpdateData(primitives, [
      'title',
      'albumId',
      'artistId',
      'albumArtistId',
      'trackNumber',
      'discNumber',
      'year',
      'duration',
      'path',
      'bitRate',
      'size',
      'suffix',
      'lyrics',
      'comment',
      'albumName',
      'artistName',
      'albumArtistName',
      'compilation',
    ]);

    const updated = await this.prisma.track.update({
      where: { id },
      data: updateData,
    });

    return TrackMapper.toDomain(updated);
  }
}
