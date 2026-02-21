import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { WaveMixService } from '../services/wave-mix.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users } from '@infrastructure/database/schema';
import { gt, gte, and } from 'drizzle-orm';

// Only process users active in the last 30 days
const ACTIVE_USER_DAYS = 30;
// Batch size for pagination
const USER_BATCH_SIZE = 100;

/**
 * Wave Mix Scheduler Service
 *
 * Manages automatic daily regeneration of Wave Mix playlists for all users
 * using BullMQ for reliable job scheduling.
 *
 * Features:
 * - Daily regeneration at 4:00 AM
 * - Processes all active users
 * - Automatic retries on failure
 * - Persistent jobs (survive server restarts)
 */
@Injectable()
export class WaveMixSchedulerService implements OnModuleInit {
  private readonly QUEUE_NAME = 'wave-mix-scheduler';
  private readonly JOB_NAME = 'regenerate-all-wave-mixes';

  constructor(
    @InjectPinoLogger(WaveMixSchedulerService.name)
    private readonly logger: PinoLogger,
    private readonly bullmqService: BullmqService,
    private readonly waveMixService: WaveMixService,
    private readonly drizzle: DrizzleService
  ) {}

  async onModuleInit() {
    // Register the processor for Wave Mix jobs
    this.bullmqService.registerProcessor(this.QUEUE_NAME, async (job) => {
      this.logger.info({ jobId: job.id, jobName: job.name }, 'Processing Wave Mix job');

      try {
        if (job.name === this.JOB_NAME) {
          await this.regenerateAllWaveMixes();
        } else if (job.name === 'regenerate-user-wave-mix') {
          await this.regenerateUserWaveMix(job.data.userId);
        }
      } catch (error) {
        this.logger.error({ jobId: job.id, error }, 'Wave Mix job failed');
        throw error; // BullMQ will handle retry
      }
    });

    // Schedule daily regeneration at 4:00 AM
    await this.scheduleDailyRegeneration();

    this.logger.info('Wave Mix Scheduler initialized');
  }

  /**
   * Schedule daily regeneration at 4:00 AM
   * Uses cron pattern for recurring jobs
   */
  async scheduleDailyRegeneration() {
    const queue = this.bullmqService.createQueue(this.QUEUE_NAME);

    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === this.JOB_NAME) {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    // Add new repeatable job: Every day at 4:00 AM
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      this.JOB_NAME,
      {},
      {
        repeat: {
          pattern: '0 4 * * *', // Cron: At 04:00 every day
        },
        attempts: 3, // Retry 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 60000, // Start with 1 minute delay
        },
      }
    );

    this.logger.info('Scheduled daily Wave Mix regeneration at 4:00 AM');
  }

  /**
   * Regenerate Wave Mix for all active users
   * Called by the daily scheduled job
   *
   * Uses cursor-based pagination to avoid loading all users into memory.
   * Only processes users who have logged in within ACTIVE_USER_DAYS.
   */
  async regenerateAllWaveMixes(): Promise<void> {
    this.logger.info(
      { activeDays: ACTIVE_USER_DAYS },
      'Starting daily Wave Mix regeneration for active users'
    );

    // Calculate cutoff date for active users
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ACTIVE_USER_DAYS);

    let successCount = 0;
    let errorCount = 0;
    let totalProcessed = 0;
    let lastId: string | null = null;

    // Process users in batches using cursor-based pagination
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Build query: active users (logged in within cutoff) with cursor pagination
      const conditions = [gte(users.lastLoginAt, cutoffDate)];
      if (lastId) {
        conditions.push(gt(users.id, lastId));
      }

      const batch = await this.drizzle.db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(and(...conditions))
        .orderBy(users.id)
        .limit(USER_BATCH_SIZE);

      if (batch.length === 0) {
        break; // No more users
      }

      // Process users in sub-batches of 10 for controlled concurrency
      const concurrencyLimit = 10;
      for (let i = 0; i < batch.length; i += concurrencyLimit) {
        const subBatch = batch.slice(i, i + concurrencyLimit);
        const results = await Promise.allSettled(
          subBatch.map(async (user) => {
            await this.waveMixService.refreshAutoPlaylists(user.id);
            return user;
          })
        );

        // Count results
        for (const result of results) {
          if (result.status === 'fulfilled') {
            successCount++;
            this.logger.debug({ userId: result.value.id }, 'Wave Mix regenerated');
          } else {
            errorCount++;
            this.logger.error({ error: result.reason }, 'Failed to regenerate Wave Mix');
          }
        }
      }

      totalProcessed += batch.length;
      lastId = batch[batch.length - 1].id;

      // Log progress every 100 users
      if (totalProcessed % 100 === 0) {
        this.logger.info(
          { processed: totalProcessed, success: successCount, errors: errorCount },
          'Wave Mix regeneration progress'
        );
      }

      // Small delay between batches to reduce system load
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.logger.info(
      { successCount, errorCount, totalProcessed },
      'Daily Wave Mix regeneration completed'
    );
  }

  /**
   * Regenerate Wave Mix for a specific user
   * Can be triggered manually or by other events
   */
  async regenerateUserWaveMix(userId: string): Promise<void> {
    this.logger.info({ userId }, 'Regenerating Wave Mix for user');
    await this.waveMixService.refreshAutoPlaylists(userId);
    this.logger.info({ userId }, 'Wave Mix regenerated successfully');
  }

  /**
   * Manually trigger Wave Mix regeneration for a user
   * Adds a job to the queue immediately
   */
  async triggerUserRegeneration(userId: string): Promise<void> {
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'regenerate-user-wave-mix',
      { userId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      }
    );

    this.logger.info({ userId }, 'Queued Wave Mix regeneration for user');
  }

  /**
   * Manually trigger immediate regeneration for all users
   * Useful for testing or manual admin intervention
   */
  async triggerImmediateRegeneration(): Promise<void> {
    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      this.JOB_NAME,
      {},
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      }
    );

    this.logger.info('Queued immediate Wave Mix regeneration for all users');
  }
}
