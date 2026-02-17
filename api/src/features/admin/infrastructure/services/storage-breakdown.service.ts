import { Injectable } from '@nestjs/common';
import { sum } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { tracks, artists, users } from '@infrastructure/database/schema';
import { StorageBreakdown } from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

@Injectable()
export class StorageBreakdownService {
  private readonly CACHE_KEY = 'dashboard:storage-breakdown';
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cache: RedisService,
  ) {}

  async get(): Promise<StorageBreakdown> {
    const cached = await this.cache.get<StorageBreakdown>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    const [musicSizeResult, metadataSizeResult, avatarSizeResult] = await Promise.all([
      this.drizzle.db.select({ sum: sum(tracks.size) }).from(tracks),
      this.drizzle.db.select({ sum: sum(artists.metadataStorageSize) }).from(artists),
      this.drizzle.db.select({ sum: sum(users.avatarSize) }).from(users),
    ]);

    const music = Number(musicSizeResult[0]?.sum || 0);
    const metadata = Number(metadataSizeResult[0]?.sum || 0);
    const avatars = Number(avatarSizeResult[0]?.sum || 0);

    const breakdown: StorageBreakdown = {
      music,
      metadata,
      avatars,
      total: music + metadata + avatars,
    };

    await this.cache.set(this.CACHE_KEY, breakdown, this.CACHE_TTL);
    return breakdown;
  }
}
