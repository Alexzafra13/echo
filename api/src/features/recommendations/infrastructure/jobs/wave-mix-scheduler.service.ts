import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { WaveMixService } from '../services/wave-mix.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users } from '@infrastructure/database/schema';

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
    private readonly drizzle: DrizzleService,
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
   */
  async regenerateAllWaveMixes(): Promise<void> {
    this.logger.info('Starting daily Wave Mix regeneration for all users');

    // Get all users (you may want to filter by activity, e.g., users who logged in last 30 days)
    const allUsers = await this.drizzle.db
      .select({ id: users.id, username: users.username })
      .from(users);

    this.logger.info({ userCount: allUsers.length }, 'Found users for Wave Mix regeneration');

    let successCount = 0;
    let errorCount = 0;

    // Process users in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            await this.waveMixService.refreshAutoPlaylists(user.id);
            successCount++;
            this.logger.debug({ userId: user.id, username: user.username }, 'Wave Mix regenerated');
          } catch (error) {
            errorCount++;
            this.logger.error({ userId: user.id, username: user.username, error }, 'Failed to regenerate Wave Mix');
          }
        })
      );
    }

    this.logger.info(
      { successCount, errorCount, totalUsers: allUsers.length },
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
