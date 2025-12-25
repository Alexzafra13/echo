import { Injectable } from '@nestjs/common';
import { count, eq, gte, and, inArray, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  customArtistImages,
  customAlbumCovers,
  metadataConflicts,
  libraryScans,
  tracks,
} from '@infrastructure/database/schema';
import { ActiveAlerts, StorageBreakdown } from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

@Injectable()
export class AlertsService {
  private readonly MAX_STORAGE_MB = 5120; // 5GB default limit

  constructor(private readonly drizzle: DrizzleService) {}

  async get(storageBreakdown: StorageBreakdown): Promise<ActiveAlerts> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      orphanedArtistImagesResult,
      orphanedAlbumCoversResult,
      pendingConflictsResult,
      recentScanErrorsResult,
      missingFilesResult,
    ] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(customArtistImages)
        .where(eq(customArtistImages.isActive, false)),
      this.drizzle.db
        .select({ count: count() })
        .from(customAlbumCovers)
        .where(eq(customAlbumCovers.isActive, false)),
      this.drizzle.db
        .select({ count: count() })
        .from(metadataConflicts)
        .where(eq(metadataConflicts.status, 'pending')),
      this.drizzle.db
        .select({ count: count() })
        .from(libraryScans)
        .where(
          and(
            inArray(libraryScans.status, ['failed', 'error']),
            gte(libraryScans.startedAt, weekAgo),
          ),
        ),
      this.drizzle.db
        .select({ count: count() })
        .from(tracks)
        .where(isNotNull(tracks.missingAt)),
    ]);

    const orphanedArtistImages = orphanedArtistImagesResult[0]?.count ?? 0;
    const orphanedAlbumCovers = orphanedAlbumCoversResult[0]?.count ?? 0;
    const pendingConflicts = pendingConflictsResult[0]?.count ?? 0;
    const recentScanErrors = recentScanErrorsResult[0]?.count ?? 0;
    const missingFiles = missingFilesResult[0]?.count ?? 0;

    const maxStorageBytes = this.MAX_STORAGE_MB * 1024 * 1024;
    const managedStorageBytes = storageBreakdown.metadata + storageBreakdown.avatars;
    const storageWarning = managedStorageBytes > maxStorageBytes * 0.75;

    const currentMB = Math.round(managedStorageBytes / (1024 * 1024));
    const percentUsed = Math.round((managedStorageBytes / maxStorageBytes) * 100);

    return {
      orphanedFiles: orphanedArtistImages + orphanedAlbumCovers,
      pendingConflicts,
      missingFiles,
      storageWarning,
      storageDetails: storageWarning
        ? {
            currentMB,
            limitMB: this.MAX_STORAGE_MB,
            percentUsed,
          }
        : undefined,
      scanErrors: recentScanErrors,
    };
  }
}
