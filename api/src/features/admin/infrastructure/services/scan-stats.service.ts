import { Injectable } from '@nestjs/common';
import { desc, inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { libraryScans } from '@infrastructure/database/schema';
import { ScanStats } from '../../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';
import { ScannerGateway } from '@features/scanner/infrastructure/gateways/scanner.gateway';

@Injectable()
export class ScanStatsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly scannerGateway: ScannerGateway,
  ) {}

  async get(): Promise<ScanStats> {
    const [latestScanResult, currentScanResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(libraryScans)
        .orderBy(desc(libraryScans.startedAt))
        .limit(1),
      this.drizzle.db
        .select()
        .from(libraryScans)
        .where(inArray(libraryScans.status, ['running', 'in_progress']))
        .orderBy(desc(libraryScans.startedAt))
        .limit(1),
    ]);

    const latestScan = latestScanResult[0] ?? null;
    const currentScan = currentScanResult[0] ?? null;

    let progress = 0;
    if (currentScan) {
      const liveProgress = this.scannerGateway.getCurrentProgress(currentScan.id);
      progress = liveProgress?.progress ?? 0;
    }

    return {
      lastScan: {
        startedAt: latestScan?.startedAt || null,
        finishedAt: latestScan?.finishedAt || null,
        status: latestScan?.status || null,
        tracksAdded: latestScan?.tracksAdded || 0,
        tracksUpdated: latestScan?.tracksUpdated || 0,
        tracksDeleted: latestScan?.tracksDeleted || 0,
      },
      currentScan: {
        isRunning: !!currentScan,
        startedAt: currentScan?.startedAt || null,
        progress,
      },
    };
  }
}
