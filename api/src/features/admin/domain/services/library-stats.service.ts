import { Injectable } from '@nestjs/common';
import { count, sum, gte } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { tracks, albums, artists, genres } from '@infrastructure/database/schema';
import { LibraryStats } from '../use-cases/get-dashboard-stats/get-dashboard-stats.dto';

@Injectable()
export class LibraryStatsService {
  private readonly CACHE_KEY = 'dashboard:library-stats';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cache: RedisService,
  ) {}

  async get(): Promise<LibraryStats> {
    const cached = await this.cache.get<LibraryStats>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTracksResult,
      totalAlbumsResult,
      totalArtistsResult,
      totalGenresResult,
      durationSumResult,
      storageSumResult,
      tracksAddedTodayResult,
      albumsAddedTodayResult,
      artistsAddedTodayResult,
    ] = await Promise.all([
      this.drizzle.db.select({ count: count() }).from(tracks),
      this.drizzle.db.select({ count: count() }).from(albums),
      this.drizzle.db.select({ count: count() }).from(artists),
      this.drizzle.db.select({ count: count() }).from(genres),
      this.drizzle.db.select({ sum: sum(tracks.duration) }).from(tracks),
      this.drizzle.db.select({ sum: sum(tracks.size) }).from(tracks),
      this.drizzle.db.select({ count: count() }).from(tracks).where(gte(tracks.createdAt, today)),
      this.drizzle.db.select({ count: count() }).from(albums).where(gte(albums.createdAt, today)),
      this.drizzle.db.select({ count: count() }).from(artists).where(gte(artists.createdAt, today)),
    ]);

    const stats: LibraryStats = {
      totalTracks: totalTracksResult[0]?.count ?? 0,
      totalAlbums: totalAlbumsResult[0]?.count ?? 0,
      totalArtists: totalArtistsResult[0]?.count ?? 0,
      totalGenres: totalGenresResult[0]?.count ?? 0,
      totalDuration: Number(durationSumResult[0]?.sum || 0),
      totalStorage: Number(storageSumResult[0]?.sum || 0),
      tracksAddedToday: tracksAddedTodayResult[0]?.count ?? 0,
      albumsAddedToday: albumsAddedTodayResult[0]?.count ?? 0,
      artistsAddedToday: artistsAddedTodayResult[0]?.count ?? 0,
    };

    await this.cache.set(this.CACHE_KEY, stats, this.CACHE_TTL);
    return stats;
  }
}
