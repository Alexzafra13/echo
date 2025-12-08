import { Injectable } from '@nestjs/common';
import { eq, desc, or, inArray, count, sql, and } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { DrizzleBaseRepository } from '@shared/base';
import { createSearchPattern } from '@shared/utils';
import { albums, artists, userStarred } from '@infrastructure/database/schema';
import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { AlbumMapper } from './album.mapper';

@Injectable()
export class DrizzleAlbumRepository
  extends DrizzleBaseRepository<Album>
  implements IAlbumRepository
{
  protected readonly mapper = AlbumMapper;
  protected readonly table = albums;

  constructor(protected readonly drizzle: DrizzleService) {
    super();
  }

  async findById(id: string): Promise<Album | null> {
    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);

    if (!result[0]) return null;

    return AlbumMapper.toDomain({
      ...result[0].album,
      artist: result[0].artistName ? { name: result[0].artistName } : undefined,
    });
  }

  async findAll(skip: number, take: number): Promise<Album[]> {
    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(desc(albums.createdAt))
      .offset(skip)
      .limit(take);

    return result.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async search(name: string, skip: number, take: number): Promise<Album[]> {
    // Use ILIKE for case-insensitive search with escaped wildcards
    const searchPattern = createSearchPattern(name);

    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(sql`${albums.name} ILIKE ${searchPattern}`)
      .orderBy(albums.name)
      .offset(skip)
      .limit(take);

    return result.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(or(eq(albums.artistId, artistId), eq(albums.albumArtistId, artistId)))
      .orderBy(desc(albums.year))
      .offset(skip)
      .limit(take);

    return result.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findRecent(take: number): Promise<Album[]> {
    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(desc(albums.createdAt))
      .limit(take);

    return result.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findMostPlayed(take: number): Promise<Album[]> {
    const topAlbumIds = await this.drizzle.db.execute<{
      albumId: string;
      totalPlayCount: bigint;
    }>(sql`
      SELECT item_id as "albumId", SUM(play_count) as "totalPlayCount"
      FROM user_play_stats
      WHERE item_type = 'album'
      GROUP BY item_id
      ORDER BY "totalPlayCount" DESC
      LIMIT ${take}
    `);

    if (topAlbumIds.rows.length === 0) {
      return this.findRecent(take);
    }

    const ids = topAlbumIds.rows.map((a) => a.albumId);

    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(inArray(albums.id, ids));

    // Maintain play count order
    const albumMap = new Map(result.map((r) => [r.album.id, r]));
    const orderedAlbums = ids
      .map((id) => albumMap.get(id))
      .filter((r): r is typeof result[0] => r !== undefined);

    return orderedAlbums.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findAlphabetically(skip: number, take: number): Promise<Album[]> {
    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(albums.orderAlbumName)
      .offset(skip)
      .limit(take);

    return result.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findByArtistName(skip: number, take: number): Promise<Album[]> {
    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
        artistOrderName: artists.orderArtistName,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(artists.orderArtistName, albums.orderAlbumName)
      .offset(skip)
      .limit(take);

    return result.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findRecentlyPlayed(userId: string, take: number): Promise<Album[]> {
    const recentAlbumIds = await this.drizzle.db.execute<{
      albumId: string;
      lastPlayed: Date;
    }>(sql`
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
    `);

    if (recentAlbumIds.rows.length === 0) {
      return [];
    }

    const ids = recentAlbumIds.rows.map((a) => a.albumId);

    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(inArray(albums.id, ids));

    // Maintain play order
    const albumMap = new Map(result.map((r) => [r.album.id, r]));
    const orderedAlbums = ids
      .map((id) => albumMap.get(id))
      .filter((r): r is typeof result[0] => r !== undefined);

    return orderedAlbums.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async findFavorites(userId: string, skip: number, take: number): Promise<Album[]> {
    const favoriteIds = await this.drizzle.db
      .select({ starredId: userStarred.starredId })
      .from(userStarred)
      .where(
        and(
          eq(userStarred.userId, userId),
          eq(userStarred.starredType, 'album'),
          eq(userStarred.sentiment, 'like'),
        ),
      )
      .orderBy(desc(userStarred.starredAt))
      .offset(skip)
      .limit(take);

    if (favoriteIds.length === 0) {
      return [];
    }

    const ids = favoriteIds.map((f) => f.starredId);

    const result = await this.drizzle.db
      .select({
        album: albums,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(inArray(albums.id, ids));

    // Maintain starred order
    const albumMap = new Map(result.map((r) => [r.album.id, r]));
    const orderedAlbums = ids
      .map((id) => albumMap.get(id))
      .filter((r): r is typeof result[0] => r !== undefined);

    return orderedAlbums.map((r) =>
      AlbumMapper.toDomain({
        ...r.album,
        artist: r.artistName ? { name: r.artistName } : undefined,
      }),
    );
  }

  async count(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(albums);

    return result[0]?.count ?? 0;
  }

  async countByArtistId(artistId: string): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(albums)
      .where(or(eq(albums.artistId, artistId), eq(albums.albumArtistId, artistId)));

    return result[0]?.count ?? 0;
  }

  async create(album: Album): Promise<Album> {
    const persistenceData = AlbumMapper.toPersistence(album);

    const result = await this.drizzle.db
      .insert(albums)
      .values(persistenceData)
      .returning();

    return AlbumMapper.toDomain(result[0]);
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

    // Convert releaseDate to string format if present (Drizzle date type expects string)
    const dbUpdateData = {
      ...updateData,
      updatedAt: new Date(),
      ...(updateData.releaseDate instanceof Date && {
        releaseDate: updateData.releaseDate.toISOString().split('T')[0],
      }),
    };

    const result = await this.drizzle.db
      .update(albums)
      .set(dbUpdateData as typeof albums.$inferInsert)
      .where(eq(albums.id, id))
      .returning();

    return result[0] ? AlbumMapper.toDomain(result[0]) : null;
  }
}
