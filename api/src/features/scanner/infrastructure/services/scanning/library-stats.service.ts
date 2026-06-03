import { Injectable } from '@nestjs/common';
import { eq, count, sum } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks } from '@infrastructure/database/schema';

// Recalcula los contadores, duraciones y tamaños de álbumes y artistas
@Injectable()
export class LibraryStatsService {
  constructor(private readonly drizzle: DrizzleService) {}

  // Recuenta songCount, duración y tamaño del álbum a partir de sus tracks
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

  // Recuenta albumCount, songCount y tamaño del artista a partir de sus álbumes y tracks
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

  async updateStats(albumId: string, artistId: string): Promise<void> {
    await Promise.all([
      this.updateAlbumStats(albumId),
      this.updateArtistStats(artistId),
    ]);
  }
}
