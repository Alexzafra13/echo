import { Injectable } from '@nestjs/common';
import { eq, desc, or, inArray, count, sql, asc, isNull, and } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { DrizzleBaseRepository } from '@shared/base';
import { createSearchPattern } from '@shared/utils';
import { tracks } from '@infrastructure/database/schema';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { TrackMapper } from './track.mapper';

@Injectable()
export class DrizzleTrackRepository
  extends DrizzleBaseRepository<Track>
  implements ITrackRepository
{
  protected readonly mapper = TrackMapper;
  protected readonly table = tracks;

  constructor(protected readonly drizzle: DrizzleService) {
    super();
  }

  async findById(id: string): Promise<Track | null> {
    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);

    return result[0] ? TrackMapper.toDomain(result[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Track[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(inArray(tracks.id, ids));

    return TrackMapper.toDomainArray(result);
  }

  async findAll(skip: number, take: number): Promise<Track[]> {
    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(isNull(tracks.missingAt)) // Exclude missing tracks
      .orderBy(desc(tracks.createdAt))
      .offset(skip)
      .limit(take);

    return TrackMapper.toDomainArray(result);
  }

  async search(title: string, skip: number, take: number): Promise<Track[]> {
    // Use ILIKE for case-insensitive search with escaped wildcards
    const searchPattern = createSearchPattern(title);

    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(and(
        sql`${tracks.title} ILIKE ${searchPattern}`,
        isNull(tracks.missingAt), // Exclude missing tracks
      ))
      .orderBy(tracks.title)
      .offset(skip)
      .limit(take);

    return TrackMapper.toDomainArray(result);
  }

  async findByAlbumId(albumId: string): Promise<Track[]> {
    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(and(eq(tracks.albumId, albumId), isNull(tracks.missingAt))) // Exclude missing
      .orderBy(asc(tracks.discNumber), asc(tracks.trackNumber));

    return TrackMapper.toDomainArray(result);
  }

  async findByArtistId(artistId: string, skip: number, take: number): Promise<Track[]> {
    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(and(
        or(eq(tracks.artistId, artistId), eq(tracks.albumArtistId, artistId)),
        isNull(tracks.missingAt), // Exclude missing tracks
      ))
      .orderBy(desc(tracks.createdAt))
      .offset(skip)
      .limit(take);

    return TrackMapper.toDomainArray(result);
  }

  async count(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(tracks)
      .where(isNull(tracks.missingAt)); // Exclude missing tracks

    return result[0]?.count ?? 0;
  }

  async findShuffledPaginated(
    seed: number,
    skip: number,
    take: number,
  ): Promise<Track[]> {
    // Usa md5(id || seed) para crear un orden determinístico y reproducible
    // Esto permite paginación consistente con el mismo seed
    const seedStr = seed.toString();

    const result = await this.drizzle.db
      .select()
      .from(tracks)
      .where(isNull(tracks.missingAt)) // Exclude missing tracks
      .orderBy(sql`md5(${tracks.id} || ${seedStr})`)
      .offset(skip)
      .limit(take);

    return TrackMapper.toDomainArray(result);
  }

  async create(track: Track): Promise<Track> {
    const persistenceData = TrackMapper.toPersistence(track);

    const result = await this.drizzle.db
      .insert(tracks)
      .values(persistenceData)
      .returning();

    return TrackMapper.toDomain(result[0]);
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

    const result = await this.drizzle.db
      .update(tracks)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tracks.id, id))
      .returning();

    return result[0] ? TrackMapper.toDomain(result[0]) : null;
  }
}
