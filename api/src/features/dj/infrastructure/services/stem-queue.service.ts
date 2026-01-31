import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as path from 'path';
import { BullmqService } from '../../../../infrastructure/queue/bullmq.service';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djStems } from '../../../../infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { OnnxStemSeparatorService } from './onnx-stem-separator.service';

interface StemJob {
  trackId: string;
  trackTitle: string;
  filePath: string;
}

const STEM_QUEUE = 'stem-separation-queue';
const STEM_JOB = 'separate-stems';

function getOptimalConcurrency(): number {
  const cpuCores = os.cpus().length;
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);

  // Stem separation is very resource-intensive
  // Use at most 2 concurrent jobs, or 1 if memory is limited
  let concurrency = Math.max(1, Math.floor(cpuCores / 4));

  // Each stem separation uses ~4-8GB RAM
  const maxByMemory = Math.max(1, Math.floor((totalMemoryGB - 2) / 6));
  concurrency = Math.min(concurrency, maxByMemory);

  return Math.min(concurrency, 2);
}

@Injectable()
export class StemQueueService implements OnModuleInit {
  private readonly concurrency: number;
  private readonly stemsDir: string;
  private isRunning = false;
  private processedInSession = 0;
  private sessionStartedAt: Date | null = null;

  constructor(
    @InjectPinoLogger(StemQueueService.name)
    private readonly logger: PinoLogger,
    private readonly bullmq: BullmqService,
    private readonly drizzle: DrizzleService,
    private readonly stemSeparator: OnnxStemSeparatorService,
    private readonly configService: ConfigService,
  ) {
    this.concurrency = getOptimalConcurrency();
    this.stemsDir = this.configService.get<string>(
      'DJ_STEMS_DIR',
      path.join(process.cwd(), 'data', 'stems'),
    );
    this.logger.info(
      { concurrency: this.concurrency, stemsDir: this.stemsDir },
      'Stem separation queue initialized',
    );
  }

  onModuleInit() {
    this.bullmq.registerProcessor(
      STEM_QUEUE,
      async (job) => {
        return this.processStemJob(job.data as StemJob);
      },
      { concurrency: this.concurrency },
    );
  }

  async startStemQueue(tracks: Array<{ id: string; title: string; path: string }>): Promise<void> {
    if (tracks.length === 0) {
      return;
    }

    // Check if separator is available
    if (!(await this.stemSeparator.isAvailable())) {
      this.logger.warn('Stem separator not available, skipping queue');
      return;
    }

    this.isRunning = true;
    this.processedInSession = 0;
    this.sessionStartedAt = new Date();

    this.logger.info(
      { trackCount: tracks.length },
      'Starting stem separation queue',
    );

    for (const track of tracks) {
      await this.bullmq.addJob(STEM_QUEUE, STEM_JOB, {
        trackId: track.id,
        trackTitle: track.title,
        filePath: track.path,
      });
    }
  }

  async enqueueTrack(track: { id: string; title: string; path: string }): Promise<void> {
    if (!(await this.stemSeparator.isAvailable())) {
      throw new Error('Stem separator not available');
    }

    await this.bullmq.addJob(STEM_QUEUE, STEM_JOB, {
      trackId: track.id,
      trackTitle: track.title,
      filePath: track.path,
    });
  }

  private async processStemJob(job: StemJob): Promise<void> {
    this.logger.info(
      { trackId: job.trackId, title: job.trackTitle },
      'Processing stem separation',
    );

    try {
      // Check if stems already exist
      const existing = await this.drizzle.db
        .select()
        .from(djStems)
        .where(eq(djStems.trackId, job.trackId))
        .limit(1);

      if (existing.length > 0 && existing[0].status === 'completed') {
        this.logger.debug({ trackId: job.trackId }, 'Stems already exist');
        return;
      }

      // Create or update stems record
      const stemsId = existing[0]?.id || crypto.randomUUID();

      if (existing.length === 0) {
        await this.drizzle.db.insert(djStems).values({
          id: stemsId,
          trackId: job.trackId,
          status: 'processing',
        });
      } else {
        await this.drizzle.db
          .update(djStems)
          .set({ status: 'processing', updatedAt: new Date() })
          .where(eq(djStems.id, stemsId));
      }

      // Run stem separation
      const result = await this.stemSeparator.separate(job.filePath, {
        outputDir: this.stemsDir,
        trackId: job.trackId,
        quality: 'high',
      });

      // Update with results (store relative paths)
      await this.drizzle.db
        .update(djStems)
        .set({
          vocalsPath: path.relative(this.stemsDir, result.vocalsPath),
          drumsPath: path.relative(this.stemsDir, result.drumsPath),
          bassPath: path.relative(this.stemsDir, result.bassPath),
          otherPath: path.relative(this.stemsDir, result.otherPath),
          totalSizeBytes: result.totalSizeBytes,
          modelUsed: result.modelUsed,
          status: 'completed',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(djStems.id, stemsId));

      this.processedInSession++;
      this.logger.info(
        {
          trackId: job.trackId,
          modelUsed: result.modelUsed,
          totalSizeMB: Math.round(result.totalSizeBytes / 1024 / 1024),
        },
        'Stem separation completed',
      );
    } catch (error) {
      this.logger.error(
        { trackId: job.trackId, error: error instanceof Error ? error.message : 'Unknown' },
        'Stem separation failed',
      );

      // Update status to failed
      await this.drizzle.db
        .update(djStems)
        .set({
          status: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(djStems.trackId, job.trackId));

      throw error;
    }
  }

  async getQueueStats(): Promise<{
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    startedAt: Date | null;
    concurrency: number;
    separatorBackend: string;
    isAvailable: boolean;
    stemsDir: string;
  }> {
    const pending = await this.drizzle.db
      .select()
      .from(djStems)
      .where(eq(djStems.status, 'pending'));

    return {
      isRunning: this.isRunning,
      pendingTracks: pending.length,
      processedInSession: this.processedInSession,
      startedAt: this.sessionStartedAt,
      concurrency: this.concurrency,
      separatorBackend: this.stemSeparator.getName(),
      isAvailable: await this.stemSeparator.isAvailable(),
      stemsDir: this.stemsDir,
    };
  }

  async stopQueue(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Stem separation queue stopped');
  }
}
