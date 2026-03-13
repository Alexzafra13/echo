import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Cron } from '@nestjs/schedule';
import { lte } from 'drizzle-orm';
import { LogService, LogCategory } from './log.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { enrichmentLogs } from '@infrastructure/database/schema';

const DEFAULT_RETENTION_DAYS = 30;
const SETTINGS_KEY = 'logs.retention_days';

/**
 * Log Cleanup Service
 *
 * Automatically cleans up old system logs and enrichment logs to prevent database growth.
 * Runs daily at 3:00 AM. Retention period configurable via admin settings (default: 30 days).
 */
@Injectable()
export class LogCleanupService {
  constructor(
    @InjectPinoLogger(LogCleanupService.name)
    private readonly logger: PinoLogger,
    private readonly logService: LogService,
    private readonly drizzle: DrizzleService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService
  ) {}

  /**
   * Get configured retention days from settings, with fallback to default
   */
  async getRetentionDays(): Promise<number> {
    const days = await this.settingsService.getNumber(SETTINGS_KEY, DEFAULT_RETENTION_DAYS);
    return Math.max(1, days);
  }

  /**
   * Clean up old logs daily at 3:00 AM
   * Runs before the Wave Mix regeneration (4 AM) to reduce system load overlap
   */
  @Cron('0 3 * * *') // Every day at 3:00 AM
  async handleCleanup() {
    try {
      const retentionDays = await this.getRetentionDays();
      this.logger.info({ retentionDays }, 'Starting scheduled log cleanup');

      const deletedCount = await this.logService.cleanupOldLogs(retentionDays);
      const enrichmentDeleted = await this.cleanupEnrichmentLogs(retentionDays);

      const totalDeleted = deletedCount + enrichmentDeleted;

      if (totalDeleted > 0) {
        this.logger.info(
          { deletedCount, enrichmentDeleted, retentionDays },
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
    const retention = daysToKeep ?? (await this.getRetentionDays());
    this.logger.info({ retentionDays: retention }, 'Manual log cleanup triggered');
    const systemDeleted = await this.logService.cleanupOldLogs(retention);
    const enrichmentDeleted = await this.cleanupEnrichmentLogs(retention);
    return systemDeleted + enrichmentDeleted;
  }

  /**
   * Delete ALL logs (system + enrichment)
   */
  async deleteAllLogs(): Promise<number> {
    this.logger.info('Delete ALL logs triggered');
    const systemDeleted = await this.logService.deleteAllLogs();
    const enrichmentDeleted = await this.deleteAllEnrichmentLogs();
    return systemDeleted + enrichmentDeleted;
  }

  /**
   * Delete ALL enrichment logs
   */
  private async deleteAllEnrichmentLogs(): Promise<number> {
    const result = await this.drizzle.db
      .delete(enrichmentLogs)
      .returning({ id: enrichmentLogs.id });

    return result.length;
  }
}
