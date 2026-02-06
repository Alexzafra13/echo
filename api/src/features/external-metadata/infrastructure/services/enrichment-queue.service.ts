import { Injectable, OnModuleInit} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { albums, artists } from '@infrastructure/database/schema';
import { isNull, sql } from 'drizzle-orm';
import { ExternalMetadataService } from '../../application/external-metadata.service';
import { MetadataEventsService } from './metadata-events.service';
import { SettingsService } from './settings.service';

/**
 * Queue names for enrichment processing
 */
const ENRICHMENT_QUEUE = 'enrichment-queue';
const ENRICHMENT_JOB = 'process-enrichment';

/**
 * Enrichment item types
 */
type EnrichmentType = 'artist' | 'album';

interface EnrichmentJob {
  type: EnrichmentType;
  entityId: string;
  entityName: string;
  attempt: number;
}

export interface EnrichmentQueueStats {
  isRunning: boolean;
  pendingArtists: number;
  pendingAlbums: number;
  totalPending: number;
  processedInSession: number;
  currentItem: string | null;
  startedAt: Date | null;
  estimatedTimeRemaining: string | null;
}

/**
 * EnrichmentQueueService
 *
 * Handles continuous background enrichment of artists and albums.
 * Uses BullMQ for reliable job processing with configurable delays
 * to respect external API rate limits.
 *
 * Flow:
 * 1. After scan completes, startEnrichmentQueue() is called
 * 2. Service counts pending items and enqueues first job
 * 3. Worker processes ONE item at a time
 * 4. After processing, checks if more items pending
 * 5. If yes, enqueues next job with delay (respects rate limits)
 * 6. If no, queue completes
 *
 * State tracking:
 * - Albums: externalInfoUpdatedAt IS NULL = pending
 * - Artists: mbidSearchedAt IS NULL = pending
 */
@Injectable()
export class EnrichmentQueueService implements OnModuleInit {
  // Session stats
  private isRunning = false;
  private processedInSession = 0;
  private currentItem: string | null = null;
  private sessionStartedAt: Date | null = null;
  private averageProcessingTime = 5000; // Initial estimate: 5 seconds

  constructor(
    @InjectPinoLogger(EnrichmentQueueService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly externalMetadataService: ExternalMetadataService,
    private readonly gateway: MetadataEventsService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit() {
    // Register the job processor
    this.bullmq.registerProcessor(ENRICHMENT_QUEUE, async (job) => {
      return this.processEnrichmentJob(job.data as EnrichmentJob);
    });

    this.logger.info('EnrichmentQueueService initialized');

    // Check if there are pending items from a previous session
    const stats = await this.getQueueStats();
    if (stats.totalPending > 0) {
      this.logger.info(
        `Found ${stats.totalPending} pending enrichment items from previous session`
      );
    }
  }

  /**
   * Start the enrichment queue after a scan completes
   * This counts all pending items and begins processing
   */
  async startEnrichmentQueue(): Promise<{ started: boolean; pending: number; message: string }> {
    if (this.isRunning) {
      const stats = await this.getQueueStats();
      return {
        started: false,
        pending: stats.totalPending,
        message: `Enrichment queue already running. ${stats.totalPending} items pending.`,
      };
    }

    const stats = await this.getQueueStats();

    if (stats.totalPending === 0) {
      return {
        started: false,
        pending: 0,
        message: 'No items pending enrichment.',
      };
    }

    // Initialize session
    this.isRunning = true;
    this.processedInSession = 0;
    this.sessionStartedAt = new Date();
    this.currentItem = null;

    this.logger.info(
      `🚀 Starting enrichment queue: ${stats.pendingArtists} artists, ${stats.pendingAlbums} albums`
    );

    // Emit start event
    this.gateway.emitQueueStarted({
      totalPending: stats.totalPending,
      pendingArtists: stats.pendingArtists,
      pendingAlbums: stats.pendingAlbums,
    });

    // Enqueue first job immediately
    await this.enqueueNextItem();

    return {
      started: true,
      pending: stats.totalPending,
      message: `Enrichment queue started. Processing ${stats.totalPending} items in background.`,
    };
  }

  /**
   * Stop the enrichment queue
   */
  async stopEnrichmentQueue(): Promise<void> {
    this.isRunning = false;
    this.currentItem = null;

    this.logger.info('⏹️ Enrichment queue stopped');

    this.gateway.emitQueueStopped({
      processedInSession: this.processedInSession,
    });
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats(): Promise<EnrichmentQueueStats> {
    const [pendingArtistsResult, pendingAlbumsResult] = await Promise.all([
      this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(artists)
        .where(isNull(artists.mbidSearchedAt)),
      this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(albums)
        .where(isNull(albums.externalInfoUpdatedAt)),
    ]);

    const pendingArtists = pendingArtistsResult[0]?.count ?? 0;
    const pendingAlbums = pendingAlbumsResult[0]?.count ?? 0;
    const totalPending = pendingArtists + pendingAlbums;

    // Calculate estimated time remaining
    let estimatedTimeRemaining: string | null = null;
    if (this.isRunning && totalPending > 0) {
      const delayMs = await this.getDelayBetweenItems();
      const totalMs = totalPending * (this.averageProcessingTime + delayMs);
      estimatedTimeRemaining = this.formatDuration(totalMs);
    }

    return {
      isRunning: this.isRunning,
      pendingArtists,
      pendingAlbums,
      totalPending,
      processedInSession: this.processedInSession,
      currentItem: this.currentItem,
      startedAt: this.sessionStartedAt,
      estimatedTimeRemaining,
    };
  }

  /**
   * Process a single enrichment job
   */
  private async processEnrichmentJob(job: EnrichmentJob): Promise<void> {
    if (!this.isRunning) {
      this.logger.debug('Queue stopped, skipping job');
      return;
    }

    const startTime = Date.now();
    this.currentItem = `${job.type}: ${job.entityName}`;

    try {
      this.logger.info(`📥 Processing ${job.type}: ${job.entityName}`);

      if (job.type === 'artist') {
        await this.externalMetadataService.enrichArtist(job.entityId, false);
      } else {
        await this.externalMetadataService.enrichAlbum(job.entityId, false);
      }

      this.processedInSession++;

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.averageProcessingTime = Math.round(
        (this.averageProcessingTime + processingTime) / 2
      );

      // Emit progress
      const stats = await this.getQueueStats();
      this.gateway.emitQueueItemCompleted({
        itemType: job.type,
        entityName: job.entityName,
        processedInSession: this.processedInSession,
        totalPending: stats.totalPending,
        estimatedTimeRemaining: stats.estimatedTimeRemaining,
      });

      this.logger.info(
        `✅ Completed ${job.type}: ${job.entityName} (${processingTime}ms, ${stats.totalPending} remaining)`
      );

    } catch (error) {
      this.logger.error(
        `❌ Error processing ${job.type} ${job.entityName}: ${(error as Error).message}`
      );

      // Emit error but continue with queue
      this.gateway.emitQueueItemError({
        itemType: job.type,
        entityName: job.entityName,
        error: (error as Error).message,
      });
    }

    this.currentItem = null;

    // Enqueue next item with delay
    await this.enqueueNextItem();
  }

  /**
   * Find and enqueue the next pending item
   */
  private async enqueueNextItem(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Priority: Artists first (they provide MBID for albums), then albums
    const nextArtist = await this.getNextPendingArtist();

    if (nextArtist) {
      await this.enqueueJob({
        type: 'artist',
        entityId: nextArtist.id,
        entityName: nextArtist.name,
        attempt: 1,
      });
      return;
    }

    const nextAlbum = await this.getNextPendingAlbum();

    if (nextAlbum) {
      await this.enqueueJob({
        type: 'album',
        entityId: nextAlbum.id,
        entityName: nextAlbum.name,
        attempt: 1,
      });
      return;
    }

    // No more items - queue complete
    this.isRunning = false;

    const duration = this.sessionStartedAt
      ? Date.now() - this.sessionStartedAt.getTime()
      : 0;

    this.logger.info(
      `🎉 Enrichment queue completed! Processed ${this.processedInSession} items in ${this.formatDuration(duration)}`
    );

    this.gateway.emitQueueCompleted({
      processedInSession: this.processedInSession,
      duration: this.formatDuration(duration),
    });
  }

  /**
   * Enqueue a job with configured delay
   */
  private async enqueueJob(job: EnrichmentJob): Promise<void> {
    const delayMs = await this.getDelayBetweenItems();

    await this.bullmq.addJob(ENRICHMENT_QUEUE, ENRICHMENT_JOB, job, {
      delay: delayMs,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });

    this.logger.debug(
      `Enqueued ${job.type}: ${job.entityName} (delay: ${delayMs}ms)`
    );
  }

  /**
   * Get next pending artist
   */
  private async getNextPendingArtist(): Promise<{ id: string; name: string } | null> {
    const result = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
      })
      .from(artists)
      .where(isNull(artists.mbidSearchedAt))
      .orderBy(sql`${artists.createdAt} DESC`)
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get next pending album
   */
  private async getNextPendingAlbum(): Promise<{ id: string; name: string } | null> {
    const result = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
      })
      .from(albums)
      .where(isNull(albums.externalInfoUpdatedAt))
      .orderBy(sql`${albums.createdAt} DESC`)
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get configured delay between items (respects rate limits)
   */
  private async getDelayBetweenItems(): Promise<number> {
    // Default: 3 seconds between items
    // This respects most API rate limits (MusicBrainz: 1 req/sec, etc.)
    const defaultDelay = 3000;

    try {
      const delay = await this.settings.getNumber(
        'metadata.enrichment_queue.delay_ms',
        defaultDelay
      );
      return Math.max(1000, delay); // Minimum 1 second
    } catch {
      return defaultDelay;
    }
  }

  /**
   * Format milliseconds to human readable duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset enrichment state for items that were marked as processed
   * but didn't actually get enriched (e.g., when no API keys were configured)
   *
   * This allows re-processing items once API keys are configured.
   *
   * @param options Configuration for reset
   * @returns Count of reset items
   */
  async resetEnrichmentState(options: {
    resetArtists?: boolean;
    resetAlbums?: boolean;
    onlyWithoutExternalData?: boolean; // Only reset items that have no external data
  } = {}): Promise<{ artistsReset: number; albumsReset: number }> {
    const {
      resetArtists = true,
      resetAlbums = true,
      onlyWithoutExternalData = true, // By default, only reset items without actual data
    } = options;

    let artistsReset = 0;
    let albumsReset = 0;

    if (resetArtists) {
      // Reset artists that were marked as searched but have no external bio/images
      // Check ALL external fields: bio, profile, background, banner, logo
      const artistConditions = onlyWithoutExternalData
        ? sql`${artists.mbidSearchedAt} IS NOT NULL
              AND ${artists.biography} IS NULL
              AND ${artists.externalProfilePath} IS NULL
              AND ${artists.externalBackgroundPath} IS NULL
              AND ${artists.externalBannerPath} IS NULL
              AND ${artists.externalLogoPath} IS NULL`
        : sql`${artists.mbidSearchedAt} IS NOT NULL`;

      const result = await this.drizzle.db
        .update(artists)
        .set({
          mbidSearchedAt: null,
          updatedAt: new Date(),
        })
        .where(artistConditions);

      artistsReset = result.rowCount ?? 0;
      this.logger.info(`Reset enrichment state for ${artistsReset} artists`);
    }

    if (resetAlbums) {
      // Reset albums that were marked as processed but have no external cover
      const albumConditions = onlyWithoutExternalData
        ? sql`${albums.externalInfoUpdatedAt} IS NOT NULL
              AND ${albums.externalCoverPath} IS NULL`
        : sql`${albums.externalInfoUpdatedAt} IS NOT NULL`;

      const result = await this.drizzle.db
        .update(albums)
        .set({
          externalInfoUpdatedAt: null,
          updatedAt: new Date(),
        })
        .where(albumConditions);

      albumsReset = result.rowCount ?? 0;
      this.logger.info(`Reset enrichment state for ${albumsReset} albums`);
    }

    return { artistsReset, albumsReset };
  }
}
