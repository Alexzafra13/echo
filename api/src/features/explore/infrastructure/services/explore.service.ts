import { Injectable } from '@nestjs/common';
import { eq, sql, and, lt, notExists, desc } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { albums } from '@infrastructure/database/schema/albums';
import { artists } from '@infrastructure/database/schema/artists';
import { tracks } from '@infrastructure/database/schema/tracks';
import { userPlayStats } from '@infrastructure/database/schema/play-stats';

export interface ExploreAlbum {
  id: string;
  name: string;
  artistId: string | null;
  artistName: string | null;
  coverArtPath: string | null;
  year: number | null;
  songCount: number;
  duration: number;
}

export interface ExploreTrack {
  id: string;
  title: string;
  albumId: string | null;
  albumName: string | null;
  artistId: string | null;
  artistName: string | null;
  coverArtPath: string | null;
  duration: number;
  playCount: number;
}

export interface ExploreArtist {
  id: string;
  name: string;
  profileImagePath: string | null;
  albumCount: number;
  songCount: number;
}

@Injectable()
export class ExploreService {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  /**
   * Get albums that the user has never played
   * @param userId User ID
   * @param limit Max results
   * @param offset Skip results
   */
  async getUnplayedAlbums(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ albums: ExploreAlbum[]; total: number }> {
    // Get albums NOT in the played list
    const result = await this.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        artistName: artists.name,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(
        notExists(
          this.db
            .select({ x: sql`1` })
            .from(userPlayStats)
            .where(
              and(
                eq(userPlayStats.userId, userId),
                eq(userPlayStats.itemType, 'album'),
                eq(userPlayStats.itemId, albums.id),
              ),
            ),
        ),
      )
      .orderBy(desc(albums.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total unplayed
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(albums)
      .where(
        notExists(
          this.db
            .select({ x: sql`1` })
            .from(userPlayStats)
            .where(
              and(
                eq(userPlayStats.userId, userId),
                eq(userPlayStats.itemType, 'album'),
                eq(userPlayStats.itemId, albums.id),
              ),
            ),
        ),
      );

    return {
      albums: result,
      total: countResult?.count ?? 0,
    };
  }

  /**
   * Get albums not played in the last N months
   * @param userId User ID
   * @param monthsAgo How many months to consider "forgotten"
   * @param limit Max results
   * @param offset Skip results
   */
  async getForgottenAlbums(
    userId: string,
    monthsAgo: number = 3,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ albums: ExploreAlbum[]; total: number }> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

    // Albums played by user but not recently
    const result = await this.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        artistName: artists.name,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
        lastPlayedAt: userPlayStats.lastPlayedAt,
      })
      .from(albums)
      .innerJoin(
        userPlayStats,
        and(
          eq(userPlayStats.itemId, albums.id),
          eq(userPlayStats.itemType, 'album'),
          eq(userPlayStats.userId, userId),
        ),
      )
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(lt(userPlayStats.lastPlayedAt, cutoffDate))
      .orderBy(userPlayStats.lastPlayedAt)
      .limit(limit)
      .offset(offset);

    // Count total
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(albums)
      .innerJoin(
        userPlayStats,
        and(
          eq(userPlayStats.itemId, albums.id),
          eq(userPlayStats.itemType, 'album'),
          eq(userPlayStats.userId, userId),
        ),
      )
      .where(lt(userPlayStats.lastPlayedAt, cutoffDate));

    return {
      albums: result.map(({ lastPlayedAt: _lastPlayedAt, ...album }) => album),
      total: countResult?.count ?? 0,
    };
  }

  /**
   * Get tracks with low play count from artists the user listens to frequently
   * "Hidden gems" - songs you might have missed from your favorite artists
   * @param userId User ID
   * @param limit Max results
   */
  async getHiddenGems(
    userId: string,
    limit: number = 30,
  ): Promise<ExploreTrack[]> {
    // Step 1: Get user's top artists (by total weighted play count)
    const topArtists = await this.db
      .select({
        artistId: userPlayStats.itemId,
        totalPlays: sql<number>`sum(${userPlayStats.weightedPlayCount})::int`,
      })
      .from(userPlayStats)
      .where(
        and(
          eq(userPlayStats.userId, userId),
          eq(userPlayStats.itemType, 'artist'),
        ),
      )
      .groupBy(userPlayStats.itemId)
      .orderBy(desc(sql`sum(${userPlayStats.weightedPlayCount})`))
      .limit(10);

    if (topArtists.length === 0) {
      return [];
    }

    const topArtistIds = topArtists.map((a: { artistId: string }) => a.artistId);

    // Step 2: Get tracks from these artists with low or no play count
    const result = await this.db
      .select({
        id: tracks.id,
        title: tracks.title,
        albumId: tracks.albumId,
        albumName: albums.name,
        artistId: tracks.artistId,
        artistName: artists.name,
        coverArtPath: albums.coverArtPath,
        duration: sql<number>`coalesce(${tracks.duration}, 0)::int`,
        playCount: sql<number>`coalesce(${userPlayStats.playCount}, 0)::int`,
      })
      .from(tracks)
      .leftJoin(albums, eq(tracks.albumId, albums.id))
      .leftJoin(artists, eq(tracks.artistId, artists.id))
      .leftJoin(
        userPlayStats,
        and(
          eq(userPlayStats.itemId, tracks.id),
          eq(userPlayStats.itemType, 'track'),
          eq(userPlayStats.userId, userId),
        ),
      )
      .where(
        and(
          sql`${tracks.artistId} IN (${sql.join(topArtistIds.map((id: string) => sql`${id}::uuid`), sql`, `)})`,
          sql`coalesce(${userPlayStats.playCount}, 0) < 3`,
        ),
      )
      .orderBy(sql`random()`)
      .limit(limit);

    return result;
  }

  /**
   * Get a random album
   */
  async getRandomAlbum(): Promise<ExploreAlbum | null> {
    const [result] = await this.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        artistName: artists.name,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(sql`random()`)
      .limit(1);

    return result ?? null;
  }

  /**
   * Get a random artist
   */
  async getRandomArtist(): Promise<ExploreArtist | null> {
    const [result] = await this.db
      .select({
        id: artists.id,
        name: artists.name,
        profileImagePath: artists.profileImagePath,
        albumCount: artists.albumCount,
        songCount: artists.songCount,
      })
      .from(artists)
      .where(sql`${artists.songCount} > 0`)
      .orderBy(sql`random()`)
      .limit(1);

    return result ?? null;
  }

  /**
   * Get multiple random albums for "Surprise Me" section
   * @param count Number of random albums
   */
  async getRandomAlbums(count: number = 6): Promise<ExploreAlbum[]> {
    const result = await this.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        artistName: artists.name,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
        songCount: albums.songCount,
        duration: albums.duration,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(sql`random()`)
      .limit(count);

    return result;
  }
}
