import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

// Keep 6 months of play history by default
const RETENTION_DAYS = 180;

/**
 * Periodically cleans up old play_history rows to prevent unbounded table growth.
 * Runs daily at 4:30 AM. Keeps the last 6 months of history.
 *
 * With 50 users × 50 plays/day = 2,500 rows/day = ~450K rows in 6 months.
 * Without cleanup: 900K+ rows/year, degrading query performance.
 */
@Injectable()
export class PlayHistoryCleanupService {
  constructor(
    @InjectPinoLogger(PlayHistoryCleanupService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCleanup(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      // Sin .returning() para no cargar miles de UUIDs en memoria solo para contar
      const result = await this.drizzle.db.execute(
        sql`DELETE FROM play_history WHERE played_at < ${cutoffDate}`
      );
      const deletedCount = result.rowCount ?? 0;

      if (deletedCount > 0) {
        this.logger.info(
          { deletedCount, retentionDays: RETENTION_DAYS },
          `Play history cleanup: removed ${deletedCount} entries older than ${RETENTION_DAYS} days`
        );
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to clean up play history');
    }
  }
}
