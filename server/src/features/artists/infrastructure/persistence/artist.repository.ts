import { Injectable } from '@nestjs/common';
import { eq, desc, count, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { DrizzleBaseRepository } from '@shared/base';
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

  async findAll(skip: number, take: number): Promise<Artist[]> {
    const result = await this.drizzle.db
      .select()
      .from(artists)
      .orderBy(desc(artists.createdAt))
      .offset(skip)
      .limit(take);

    return ArtistMapper.toDomainArray(result);
  }

  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    // Use pg_trgm similarity search
    const result = await this.drizzle.db.execute(sql`
      SELECT *
      FROM artists
      WHERE name % ${name}
      ORDER BY similarity(name, ${name}) DESC, name ASC
      LIMIT ${take}
      OFFSET ${skip}
    `);

    return ArtistMapper.toDomainArray(result.rows as any[]);
  }

  async count(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(artists);

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
