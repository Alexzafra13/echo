import { Injectable } from '@nestjs/common';
import { eq, desc, count, sql, gt, and, inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { DrizzleBaseRepository } from '@shared/base';
import { createSearchPattern } from '@shared/utils';
import { artists } from '@infrastructure/database/schema';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { ArtistMapper } from './artist.mapper';

@Injectable()
export class DrizzleArtistRepository
  extends DrizzleBaseRepository<Artist>
  implements IArtistRepository
{
  protected readonly mapper = ArtistMapper;
  protected readonly table = artists;

  constructor(protected readonly drizzle: DrizzleService) {
    super();
  }

  async findById(id: string): Promise<Artist | null> {
    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    return result[0] ? ArtistMapper.toDomain(result[0]) : null;
  }

  async findByName(name: string): Promise<Artist | null> {
    // Case-insensitive exact match using LOWER()
    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(sql`LOWER(${artists.name}) = LOWER(${name})`)
      .limit(1);

    return result[0] ? ArtistMapper.toDomain(result[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Artist[]> {
    if (ids.length === 0) return [];

    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(inArray(artists.id, ids));

    return ArtistMapper.toDomainArray(result);
  }

  async findByNames(names: string[]): Promise<Map<string, Artist>> {
    if (names.length === 0) return new Map();

    // Normalize names to lowercase for comparison
    const lowerNames = names.map(n => n.toLowerCase());

    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(sql`LOWER(${artists.name}) IN ${lowerNames}`);

    // Build map with lowercase name as key for O(1) lookup
    const artistMap = new Map<string, Artist>();
    for (const row of result) {
      const artist = ArtistMapper.toDomain(row);
      artistMap.set(artist.name.toLowerCase(), artist);
    }

    return artistMap;
  }

  async findAll(skip: number, take: number): Promise<Artist[]> {
    // Only return artists with content (at least one song)
    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(gt(artists.songCount, 0))
      .orderBy(desc(artists.createdAt))
      .offset(skip)
      .limit(take);

    return ArtistMapper.toDomainArray(result);
  }

  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    // Use ILIKE for case-insensitive search with escaped wildcards
    // Only return artists with content (at least one song)
    const searchPattern = createSearchPattern(name);

    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(and(
        sql`${artists.name} ILIKE ${searchPattern}`,
        gt(artists.songCount, 0),
      ))
      .orderBy(artists.name)
      .offset(skip)
      .limit(take);

    return ArtistMapper.toDomainArray(result);
  }

  async count(): Promise<number> {
    // Only count artists with content (at least one song)
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(artists)
      .where(gt(artists.songCount, 0));

    return result[0]?.count ?? 0;
  }

  async create(artist: Artist): Promise<Artist> {
    const persistenceData = ArtistMapper.toPersistence(artist);

    const result = await this.drizzle.db
      .insert(artists)
      .values(persistenceData)
      .returning();

    return ArtistMapper.toDomain(result[0]);
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

    const result = await this.drizzle.db
      .update(artists)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, id))
      .returning();

    return result[0] ? ArtistMapper.toDomain(result[0]) : null;
  }
}
