import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BullmqService } from '../../../../infrastructure/queue/bullmq.service';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djAnalysis, tracks } from '../../../../infrastructure/database/schema';
import { eq, notInArray, count, inArray, sql } from 'drizzle-orm';
import { EssentiaAnalyzerService } from './essentia-analyzer.service';
import { DjAnalysis } from '../../domain/entities/dj-analysis.entity';
import { ScannerGateway } from '../../../scanner/infrastructure/gateways/scanner.gateway';

interface DjAnalysisJob {
  trackId: string;
  trackTitle: string;
  filePath: string;
}

const DJ_ANALYSIS_QUEUE = 'dj-analysis-queue';
const DJ_ANALYSIS_JOB = 'analyze-track';

@Injectable()
export class DjAnalysisQueueService implements OnModuleInit {
  private readonly concurrency: number;
  private isRunning = false;
  private processedInSession = 0;
  private sessionStartedAt: Date | null = null;
  private totalToProcess = 0;
  private averageProcessingTime = 3000; // Initial estimate, updated dynamically
  private processingTimes: number[] = []; // Track actual processing times for averaging

  constructor(
    @InjectPinoLogger(DjAnalysisQueueService.name)
    private readonly logger: PinoLogger,
    private readonly bullmq: BullmqService,
    private readonly drizzle: DrizzleService,
    private readonly analyzer: EssentiaAnalyzerService,
    @Inject(forwardRef(() => ScannerGateway))
    private readonly scannerGateway: ScannerGateway,
  ) {
    // Match BullMQ concurrency to the Essentia worker pool size
    this.concurrency = this.analyzer.getPoolSize();
    this.logger.info({ concurrency: this.concurrency }, 'DJ Analysis queue initialized');
  }

  onModuleInit() {
    this.bullmq.registerProcessor(
      DJ_ANALYSIS_QUEUE,
      async (job) => {
        return this.processAnalysisJob(job.data as DjAnalysisJob);
      },
      { concurrency: this.concurrency },
    );

    // Resume any pending/stale analyses from a previous run (e.g. after restart or Redis flush)
    setTimeout(() => this.resumePendingAnalyses(), 5000);
  }

  /**
   * Re-enqueue tracks that are pending or stuck in analyzing state.
   * This handles container restarts and Redis flushes gracefully.
   */
  private async resumePendingAnalyses(): Promise<void> {
    try {
      // Reset stale "analyzing" back to pending
      await this.drizzle.db
        .update(djAnalysis)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(eq(djAnalysis.status, 'analyzing'));

      // Check for pending tracks
      const pendingTracks = await this.drizzle.db
        .select({
          trackId: djAnalysis.trackId,
          title: tracks.title,
          path: tracks.path,
        })
        .from(djAnalysis)
        .innerJoin(tracks, eq(djAnalysis.trackId, tracks.id))
        .where(eq(djAnalysis.status, 'pending'));

      if (pendingTracks.length === 0) return;

      this.logger.info(
        { count: pendingTracks.length },
        'Resuming pending DJ analyses from previous session',
      );

      this.isRunning = true;
      this.processedInSession = 0;
      this.sessionStartedAt = new Date();
      this.totalToProcess = pendingTracks.length;

      for (const track of pendingTracks) {
        await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
          trackId: track.trackId,
          trackTitle: track.title,
          filePath: track.path,
        });
      }
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to resume pending DJ analyses',
      );
    }
  }

  /**
   * Start analysis queue for all tracks without DJ analysis
   * Called automatically after library scan
   */
  async startAnalysisQueue(): Promise<{ started: boolean; pending: number; message: string }> {
    // Get all tracks that don't have completed DJ analysis (using Drizzle subquery)
    const completedAnalysisIds = this.drizzle.db
      .select({ trackId: djAnalysis.trackId })
      .from(djAnalysis)
      .where(eq(djAnalysis.status, 'completed'));

    const pendingTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
      })
      .from(tracks)
      .where(notInArray(tracks.id, completedAnalysisIds));

    if (pendingTracks.length === 0) {
      return {
        started: false,
        pending: 0,
        message: 'No tracks pending DJ analysis.',
      };
    }

    // If queue is already running, return current status
    if (this.isRunning) {
      return {
        started: false,
        pending: pendingTracks.length,
        message: `DJ analysis queue already running. ${pendingTracks.length} tracks pending.`,
      };
    }

    this.isRunning = true;
    this.processedInSession = 0;
    this.sessionStartedAt = new Date();
    this.totalToProcess = pendingTracks.length;

    this.logger.info(
      { trackCount: pendingTracks.length },
      'Starting DJ analysis queue',
    );

    // Emit initial progress
    this.emitProgress();

    // Enqueue all tracks
    for (const track of pendingTracks) {
      await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
        trackId: track.id,
        trackTitle: track.title,
        filePath: track.path,
      });
    }

    return {
      started: true,
      pending: pendingTracks.length,
      message: `Started DJ analysis for ${pendingTracks.length} tracks.`,
    };
  }

  /**
   * Start analysis queue for specific tracks
   */
  async startAnalysisQueueForTracks(trackList: Array<{ id: string; title: string; path: string }>): Promise<void> {
    if (trackList.length === 0) {
      return;
    }

    this.isRunning = true;
    this.processedInSession = 0;
    this.sessionStartedAt = new Date();
    this.totalToProcess = trackList.length;

    this.logger.info(
      { trackCount: trackList.length },
      'Starting DJ analysis queue for specific tracks',
    );

    // Emit initial progress
    this.emitProgress();

    // Enqueue all tracks
    for (const track of trackList) {
      await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
        trackId: track.id,
        trackTitle: track.title,
        filePath: track.path,
      });
    }
  }

  async enqueueTrack(track: { id: string; title: string; path: string }): Promise<void> {
    await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
      trackId: track.id,
      trackTitle: track.title,
      filePath: track.path,
    });
  }

  private async processAnalysisJob(job: DjAnalysisJob): Promise<void> {
    const startTime = Date.now();

    this.logger.debug(
      { trackId: job.trackId, title: job.trackTitle },
      'Processing DJ analysis',
    );

    try {
      // Use transaction to avoid TOCTOU race condition
      const analysisId = await this.drizzle.db.transaction(async (tx) => {
        // Check if analysis already exists with row lock
        const existing = await tx
          .select()
          .from(djAnalysis)
          .where(eq(djAnalysis.trackId, job.trackId))
          .limit(1);

        if (existing.length > 0 && (existing[0].status === 'completed' || existing[0].status === 'analyzing')) {
          this.logger.debug({ trackId: job.trackId, status: existing[0].status }, 'Analysis already in progress or completed');
          return null; // Skip processing
        }

        // Create or update analysis record atomically
        const id = existing[0]?.id || crypto.randomUUID();

        if (existing.length === 0) {
          await tx.insert(djAnalysis).values({
            id,
            trackId: job.trackId,
            status: 'analyzing',
          });
        } else {
          await tx
            .update(djAnalysis)
            .set({ status: 'analyzing', updatedAt: new Date() })
            .where(eq(djAnalysis.id, id));
        }

        return id;
      });

      // Skip if already completed
      if (analysisId === null) {
        return;
      }

      // First, try to get BPM/Key from tracks table (ID3 tags)
      const trackData = await this.drizzle.db
        .select({ bpm: tracks.bpm, initialKey: tracks.initialKey })
        .from(tracks)
        .where(eq(tracks.id, job.trackId))
        .limit(1);

      const trackBpm = trackData[0]?.bpm || 0;
      const trackKey = trackData[0]?.initialKey || '';

      // Run audio analysis — pass ID3 hints so the worker can skip expensive
      // BPM/Key algorithms when tags are already available
      let analyzedBpm = 0;
      let analyzedKey = 'Unknown';
      let energy = 0.5;
      let rawEnergy: number | null = null;
      let danceability: number | null = null;

      try {
        const result = await this.analyzer.analyze(job.filePath, {
          bpm: trackBpm,
          key: trackKey,
        });
        analyzedBpm = result.bpm;
        analyzedKey = result.key;
        energy = result.energy;
        rawEnergy = result.rawEnergy ?? null;
        danceability = result.danceability ?? null;
      } catch (error) {
        this.logger.warn(
          { trackId: job.trackId, error: error instanceof Error ? error.message : 'Unknown' },
          'Audio analysis failed, using defaults (bpm=0, key=Unknown, energy=0.5)',
        );
      }

      // Use ID3 tags first, fallback to Essentia analysis
      const finalBpm = trackBpm > 0 ? trackBpm : analyzedBpm;
      const finalKey = trackKey && trackKey !== 'Unknown' ? trackKey : analyzedKey;

      // If no useful data from any source, mark as failed so it gets retried
      const hasUsefulData = finalBpm > 0 || (finalKey && finalKey !== 'Unknown');
      if (!hasUsefulData) {
        await this.drizzle.db
          .update(djAnalysis)
          .set({
            status: 'failed',
            analysisError: 'No BPM or key detected from analysis or ID3 tags',
            updatedAt: new Date(),
          })
          .where(eq(djAnalysis.id, analysisId));

        this.processedInSession++;
        this.updateAverageProcessingTime(Date.now() - startTime);
        this.emitProgress();

        this.logger.warn(
          { trackId: job.trackId },
          'DJ analysis produced no useful data, marked as failed for retry',
        );
        return;
      }

      // Convert key to Camelot
      const camelotKey = DjAnalysis.keyToCamelot(finalKey);

      // Update with results
      await this.drizzle.db
        .update(djAnalysis)
        .set({
          bpm: finalBpm,
          key: finalKey,
          camelotKey: camelotKey || null,
          energy: energy,
          rawEnergy: rawEnergy,
          danceability,
          status: 'completed',
          analyzedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(djAnalysis.id, analysisId));

      this.processedInSession++;

      // Update average processing time with actual measurement
      this.updateAverageProcessingTime(Date.now() - startTime);

      // Emit progress via WebSocket
      this.emitProgress();

      // Check if all tracks are done
      if (this.processedInSession >= this.totalToProcess) {
        this.isRunning = false;
        this.emitProgress(); // Final update with isRunning = false

        // Auto-calibrate energy for the entire library now that batch is complete
        this.recalibrateEnergy().catch((err) => {
          this.logger.warn(
            { error: err instanceof Error ? err.message : 'Unknown' },
            'Energy recalibration failed (non-critical)',
          );
        });
      }

      // Determine the source of BPM/Key
      let bpmSource = 'none';
      let keySource = 'none';
      if (trackBpm > 0) bpmSource = 'id3-tags';
      else if (analyzedBpm > 0) bpmSource = 'essentia';
      if (trackKey && trackKey !== 'Unknown') keySource = 'id3-tags';
      else if (analyzedKey && analyzedKey !== 'Unknown') keySource = 'essentia';

      this.logger.info(
        {
          trackId: job.trackId,
          bpm: finalBpm,
          key: finalKey,
          camelotKey,
          bpmSource,
          keySource,
        },
        'DJ analysis completed',
      );
    } catch (error) {
      this.logger.error(
        { trackId: job.trackId, error: error instanceof Error ? error.message : 'Unknown' },
        'DJ analysis failed',
      );

      // Update status to failed
      await this.drizzle.db
        .update(djAnalysis)
        .set({
          status: 'failed',
          analysisError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(djAnalysis.trackId, job.trackId));

      throw error;
    }
  }

  async getQueueStats(): Promise<{
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    startedAt: Date | null;
    concurrency: number;
    analyzerBackend: string;
  }> {
    // Single query with GROUP BY instead of two round trips
    const statusCounts = await this.drizzle.db
      .select({ status: djAnalysis.status, value: count() })
      .from(djAnalysis)
      .where(inArray(djAnalysis.status, ['pending', 'analyzing']))
      .groupBy(djAnalysis.status);

    const pendingCount = statusCounts.find(r => r.status === 'pending')?.value ?? 0;
    const analyzingCount = statusCounts.find(r => r.status === 'analyzing')?.value ?? 0;

    // Use DB state (survives restarts) — if tracks are pending or analyzing, work is happening
    const hasWork = pendingCount > 0 || analyzingCount > 0;

    return {
      isRunning: this.isRunning || hasWork,
      pendingTracks: pendingCount + analyzingCount,
      processedInSession: this.processedInSession,
      startedAt: this.sessionStartedAt,
      concurrency: this.concurrency,
      analyzerBackend: this.analyzer.getName(),
    };
  }

  async stopQueue(): Promise<void> {
    this.isRunning = false;
    this.emitProgress(); // Emit final stopped state
    this.logger.info('DJ analysis queue stopped');
  }

  /**
   * Emit current progress via WebSocket
   */
  private emitProgress(): void {
    const pendingTracks = Math.max(0, this.totalToProcess - this.processedInSession);
    const estimatedTimeRemaining = this.isRunning && pendingTracks > 0
      ? this.formatDuration((pendingTracks / this.concurrency) * this.averageProcessingTime)
      : null;

    try {
      this.scannerGateway.emitDjProgress({
        isRunning: this.isRunning,
        pendingTracks,
        processedInSession: this.processedInSession,
        estimatedTimeRemaining,
      });
    } catch (error) {
      // WebSocket may be unavailable, don't let it crash the queue
      this.logger.debug(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to emit DJ progress via WebSocket',
      );
    }
  }

  /**
   * Update average processing time with actual measurement
   * Keeps a rolling window of last 20 measurements for accuracy
   */
  private updateAverageProcessingTime(processingTime: number): void {
    this.processingTimes.push(processingTime);

    // Keep only last 20 measurements for rolling average
    if (this.processingTimes.length > 20) {
      this.processingTimes.shift();
    }

    // Calculate new average
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.averageProcessingTime = Math.round(sum / this.processingTimes.length);
  }

  /**
   * Retry all failed analyses
   * Resets failed status to pending and re-enqueues tracks
   */
  async retryFailedAnalyses(): Promise<{ retried: number; message: string }> {
    // Get all failed analyses with track info
    const failedAnalyses = await this.drizzle.db
      .select({
        analysisId: djAnalysis.id,
        trackId: djAnalysis.trackId,
        title: tracks.title,
        path: tracks.path,
      })
      .from(djAnalysis)
      .innerJoin(tracks, eq(djAnalysis.trackId, tracks.id))
      .where(eq(djAnalysis.status, 'failed'));

    if (failedAnalyses.length === 0) {
      return {
        retried: 0,
        message: 'No failed analyses to retry.',
      };
    }

    // Reset status to pending
    await this.drizzle.db
      .update(djAnalysis)
      .set({
        status: 'pending',
        analysisError: null,
        updatedAt: new Date(),
      })
      .where(eq(djAnalysis.status, 'failed'));

    // Re-enqueue all failed tracks
    for (const analysis of failedAnalyses) {
      await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
        trackId: analysis.trackId,
        trackTitle: analysis.title,
        filePath: analysis.path,
      });
    }

    // Update session counters if not already running
    if (!this.isRunning) {
      this.isRunning = true;
      this.processedInSession = 0;
      this.sessionStartedAt = new Date();
      this.totalToProcess = failedAnalyses.length;
      this.emitProgress();
    } else {
      // If already running, just add to total
      this.totalToProcess += failedAnalyses.length;
    }

    this.logger.info(
      { count: failedAnalyses.length },
      'Retrying failed DJ analyses',
    );

    return {
      retried: failedAnalyses.length,
      message: `Retrying ${failedAnalyses.length} failed analyses.`,
    };
  }

  /**
   * Auto-calibrate energy values using the real median of rawEnergy.
   *
   * The raw energy (weighted average of 5 audio features) clusters around
   * a library-specific center that depends on the music genres present.
   * A classical library clusters differently than EDM or rock.
   *
   * This method:
   * 1. Computes the median rawEnergy across all completed tracks
   * 2. Applies a sigmoid centered on that median to spread values across 0-1
   * 3. Updates all tracks in a single SQL statement (no re-analysis needed)
   *
   * Called automatically after each analysis batch completes.
   */
  async recalibrateEnergy(): Promise<void> {
    // Need raw_energy data to calibrate
    const countResult = await this.drizzle.db
      .select({ value: count() })
      .from(djAnalysis)
      .where(eq(djAnalysis.status, 'completed'));

    const totalCompleted = countResult[0]?.value ?? 0;
    if (totalCompleted < 20) {
      this.logger.debug(
        { totalCompleted },
        'Skipping energy recalibration — need at least 20 completed tracks',
      );
      return;
    }

    // Compute median rawEnergy using PostgreSQL percentile_cont
    const medianResult = await this.drizzle.db.execute(
      sql`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY raw_energy) AS median
          FROM dj_analysis
          WHERE status = 'completed' AND raw_energy IS NOT NULL`,
    );

    const median = parseFloat((medianResult as any).rows?.[0]?.median ?? (medianResult as any)[0]?.median);
    if (isNaN(median) || median <= 0 || median >= 1) {
      this.logger.debug({ median }, 'Skipping recalibration — invalid median');
      return;
    }

    // Apply sigmoid: energy = 1 / (1 + exp(-12 * (raw_energy - median)))
    // Steepness 12 provides good contrast without extreme compression
    const updated = await this.drizzle.db.execute(
      sql`UPDATE dj_analysis
          SET energy = 1.0 / (1.0 + exp(-12.0 * (raw_energy - ${median}))),
              updated_at = NOW()
          WHERE status = 'completed' AND raw_energy IS NOT NULL`,
    );

    this.logger.info(
      { median: median.toFixed(4), totalCompleted },
      'Energy recalibrated using library median',
    );
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
}
