import { Injectable } from '@nestjs/common';
import { eq, count, sum } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks } from '@infrastructure/database/schema';

/**
 * Service for updating library statistics
 * Calculates and updates album/artist counts, durations, and sizes
 */
@Injectable()
export class LibraryStatsService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Update album statistics (songCount, duration, size)
   * based on its linked tracks
   */
  async updateAlbumStats(albumId: string): Promise<void> {
    const stats = await this.drizzle.db
      .select({
        count: count(),
        totalDuration: sum(tracks.duration),
        totalSize: sum(tracks.size),
      })
      .from(tracks)
      .where(eq(tracks.albumId, albumId));

    await this.drizzle.db
      .update(albums)
      .set({
        songCount: stats[0]?.count ?? 0,
        duration: Number(stats[0]?.totalDuration) || 0,
        size: Number(stats[0]?.totalSize ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(albums.id, albumId));
  }

  /**
   * Update artist statistics (albumCount, songCount, size)
   * based on its linked albums and tracks
   */
  async updateArtistStats(artistId: string): Promise<void> {
    const [albumCountResult, trackStats] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(albums)
        .where(eq(albums.artistId, artistId)),
      this.drizzle.db
        .select({
          count: count(),
          totalSize: sum(tracks.size),
        })
        .from(tracks)
        .where(eq(tracks.artistId, artistId)),
    ]);

    await this.drizzle.db
      .update(artists)
      .set({
        albumCount: albumCountResult[0]?.count ?? 0,
        songCount: trackStats[0]?.count ?? 0,
        size: Number(trackStats[0]?.totalSize ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));
  }

  /**
   * Update both album and artist stats
   */
  async updateStats(albumId: string, artistId: string): Promise<void> {
    await Promise.all([
      this.updateAlbumStats(albumId),
      this.updateArtistStats(artistId),
    ]);
  }
}
