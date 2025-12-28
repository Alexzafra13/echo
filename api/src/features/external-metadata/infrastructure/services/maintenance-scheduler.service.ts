import { Injectable, OnModuleInit} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { CleanupService } from './cleanup.service';
import { MetadataCacheService } from './metadata-cache.service';

/**
 * Maintenance Scheduler Service
 *
 * Manages automatic maintenance tasks for external metadata:
 * - Daily cleanup of expired metadata cache
 * - Weekly cleanup of orphaned files
 *
 * Uses BullMQ for reliable job scheduling with persistence.
 */
@Injectable()
export class MaintenanceSchedulerService implements OnModuleInit {
  private readonly QUEUE_NAME = 'metadata-maintenance';

  constructor(
    @InjectPinoLogger(MaintenanceSchedulerService.name)
    private readonly logger: PinoLogger,
    private readonly bullmqService: BullmqService,
    private readonly cleanupService: CleanupService,
    private readonly cacheService: MetadataCacheService,
  ) {}

  async onModuleInit() {
    // Register the processor for maintenance jobs
    this.bullmqService.registerProcessor(this.QUEUE_NAME, async (job) => {
      this.logger.info(`Processing maintenance job: ${job.name}`);

      try {
        switch (job.name) {
          case 'cleanup-expired-cache':
            await this.runCacheCleanup();
            break;
          case 'cleanup-orphaned-files':
            await this.runOrphanedFilesCleanup();
            break;
          case 'full-cleanup':
            await this.runFullCleanup();
            break;
          default:
            this.logger.warn(`Unknown job name: ${job.name}`);
        }
      } catch (error) {
        this.logger.error(`Maintenance job failed: ${(error as Error).message}`, (error as Error).stack);
        throw error; // BullMQ will handle retry
      }
    });

    // Schedule daily cache cleanup at 3:00 AM
    await this.scheduleDailyCacheCleanup();

    // Schedule weekly full cleanup at Sunday 4:00 AM
    await this.scheduleWeeklyFullCleanup();

    this.logger.info('Maintenance Scheduler initialized');
  }

  /**
   * Schedule daily cache cleanup at 3:00 AM
   */
  private async scheduleDailyCacheCleanup() {
    const queue = this.bullmqService.createQueue(this.QUEUE_NAME);

    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'cleanup-expired-cache') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    // Add new repeatable job: Every day at 3:00 AM
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'cleanup-expired-cache',
      {},
      {
        repeat: {
          pattern: '0 3 * * *', // Cron: At 03:00 every day
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      }
    );

    this.logger.info('Scheduled daily cache cleanup at 3:00 AM');
  }

  /**
   * Schedule weekly full cleanup at Sunday 4:00 AM
   */
  private async scheduleWeeklyFullCleanup() {
    const queue = this.bullmqService.createQueue(this.QUEUE_NAME);

    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'full-cleanup') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    // Add new repeatable job: Every Sunday at 4:00 AM
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'full-cleanup',
      {},
      {
        repeat: {
          pattern: '0 4 * * 0', // Cron: At 04:00 every Sunday
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      }
    );

    this.logger.info('Scheduled weekly full cleanup at Sunday 4:00 AM');
  }

  /**
   * Run cache cleanup (expired entries only)
   */
  private async runCacheCleanup(): Promise<void> {
    this.logger.info('Running scheduled cache cleanup...');

    const result = await this.cleanupService.cleanupExpiredCache();

    this.logger.info(
      `Cache cleanup completed: ${result.entriesRemoved} entries removed, ${result.errors.length} errors`
    );
  }

  /**
   * Run orphaned files cleanup (dry run = false for scheduled jobs)
   */
  private async runOrphanedFilesCleanup(): Promise<void> {
    this.logger.info('Running scheduled orphaned files cleanup...');

    const result = await this.cleanupService.cleanupOrphanedFiles(false);

    this.logger.info(
      `Orphaned files cleanup completed: ${result.filesRemoved} files removed, ` +
      `${(result.spaceFree / 1024 / 1024).toFixed(2)} MB freed`
    );
  }

  /**
   * Run full cleanup (cache + orphaned files)
   */
  private async runFullCleanup(): Promise<void> {
    this.logger.info('Running scheduled full cleanup...');

    const result = await this.cleanupService.runFullCleanup(false);

    this.logger.info(
      `Full cleanup completed: ${result.files.filesRemoved} files, ` +
      `${result.cache.entriesRemoved} cache entries, ` +
      `${(result.files.spaceFree / 1024 / 1024).toFixed(2)} MB freed`
    );
  }

  /**
   * Manually trigger cache cleanup immediately
   */
  async triggerCacheCleanup(): Promise<void> {
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'cleanup-expired-cache',
      {},
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      }
    );

    this.logger.info('Queued immediate cache cleanup');
  }

  /**
   * Manually trigger full cleanup immediately
   */
  async triggerFullCleanup(): Promise<void> {
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'full-cleanup',
      {},
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      }
    );

    this.logger.info('Queued immediate full cleanup');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    total: number;
    byEntityType: Record<string, number>;
    byProvider: Record<string, number>;
  }> {
    return this.cacheService.getStats();
  }
}
