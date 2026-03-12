import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Cron } from '@nestjs/schedule';
import { lte } from 'drizzle-orm';
import { LogService, LogCategory } from './log.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { enrichmentLogs } from '@infrastructure/database/schema';

// Retention period: 30 days
const LOG_RETENTION_DAYS = 30;

/**
 * Log Cleanup Service
 *
 * Automatically cleans up old system logs and enrichment logs to prevent database growth.
 * Runs daily at 3:00 AM. Keeps logs from the last 30 days.
 */
@Injectable()
export class LogCleanupService {
  constructor(
    @InjectPinoLogger(LogCleanupService.name)
    private readonly logger: PinoLogger,
    private readonly logService: LogService,
    private readonly drizzle: DrizzleService
  ) {}

  /**
   * Clean up old logs daily at 3:00 AM
   * Runs before the Wave Mix regeneration (4 AM) to reduce system load overlap
   */
  @Cron('0 3 * * *') // Every day at 3:00 AM
  async handleCleanup() {
    try {
      this.logger.info({ retentionDays: LOG_RETENTION_DAYS }, 'Starting scheduled log cleanup');

      const deletedCount = await this.logService.cleanupOldLogs(LOG_RETENTION_DAYS);
      const enrichmentDeleted = await this.cleanupEnrichmentLogs(LOG_RETENTION_DAYS);

      const totalDeleted = deletedCount + enrichmentDeleted;

      if (totalDeleted > 0) {
        this.logger.info(
          { deletedCount, enrichmentDeleted, retentionDays: LOG_RETENTION_DAYS },
          'Log cleanup completed'
        );
      } else {
        this.logger.debug('No old logs to clean up');
      }
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to clean up old logs'
      );

      // Log the failure to the system logs for visibility
      try {
        await this.logService.error(
          LogCategory.CLEANUP,
          'Scheduled log cleanup failed',
          {},
          error instanceof Error ? error : new Error(String(error))
        );
      } catch {
        // Ignore if we can't log the error
      }
    }
  }

  /**
   * Clean up old enrichment logs
   */
  private async cleanupEnrichmentLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.drizzle.db
      .delete(enrichmentLogs)
      .where(lte(enrichmentLogs.createdAt, cutoffDate))
      .returning({ id: enrichmentLogs.id });

    return result.length;
  }

  /**
   * Manually trigger log cleanup
   * Useful for admin-initiated cleanup
   */
  async triggerCleanup(daysToKeep?: number): Promise<number> {
    const retention = daysToKeep ?? LOG_RETENTION_DAYS;
    this.logger.info({ retentionDays: retention }, 'Manual log cleanup triggered');
    const systemDeleted = await this.logService.cleanupOldLogs(retention);
    const enrichmentDeleted = await this.cleanupEnrichmentLogs(retention);
    return systemDeleted + enrichmentDeleted;
  }
}
