import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { PlayEvent, PlayContext, SourceType } from '../entities/play-event.types';
import { PlayStatsCalculatorService } from '../services/play-stats-calculator.service';

export interface RecordPlayInput {
  userId: string;
  trackId: string;
  playContext: PlayContext;
  completionRate?: number;
  sourceId?: string;
  sourceType?: SourceType;
  client?: string;
}

@Injectable()
export class RecordPlayUseCase {
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 1000;

  constructor(
    @InjectPinoLogger(RecordPlayUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
    private readonly statsCalculator: PlayStatsCalculatorService,
  ) {}

  async execute(input: RecordPlayInput): Promise<PlayEvent> {
    const completionRate = input.completionRate ?? 1.0; // Default to full completion
    const skipped = this.statsCalculator.isSkipped(completionRate);

    this.logger.debug(
      { userId: input.userId, trackId: input.trackId, completionRate, playContext: input.playContext },
      'Recording play event'
    );

    // Record the play event
    const playEvent = await this.repository.recordPlay({
      userId: input.userId,
      trackId: input.trackId,
      playedAt: new Date(),
      client: input.client,
      playContext: input.playContext,
      completionRate,
      skipped,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
    });

    // Update aggregated stats asynchronously with retry logic
    this.updatePlayStatsWithRetry(
      input.userId,
      input.trackId,
      input.playContext,
      completionRate,
    ).catch(err => {
      // Final failure after all retries
      this.logger.error(
        {
          userId: input.userId,
          trackId: input.trackId,
          error: err.message,
          stack: err.stack,
        },
        'Failed to update play stats after all retries'
      );
    });

    return playEvent;
  }

  /**
   * Update play stats with exponential backoff retry logic
   */
  private async updatePlayStatsWithRetry(
    userId: string,
    trackId: string,
    playContext: PlayContext,
    completionRate: number,
    attempt: number = 1,
  ): Promise<void> {
    try {
      await this.repository.updatePlayStats(userId, trackId, playContext, completionRate);

      if (attempt > 1) {
        this.logger.info(
          { userId, trackId, attempt },
          'Play stats updated successfully after retry'
        );
      }
    } catch (error) {
      const isLastAttempt = attempt >= this.MAX_RETRIES;

      if (isLastAttempt) {
        // Last attempt failed, throw to be caught by outer catch
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      this.logger.warn(
        {
          userId,
          trackId,
          attempt,
          maxRetries: this.MAX_RETRIES,
          nextRetryInMs: delay,
          error: (error as Error).message,
        },
        'Failed to update play stats, retrying...'
      );

      // Wait before retry
      await this.sleep(delay);

      // Retry
      return this.updatePlayStatsWithRetry(userId, trackId, playContext, completionRate, attempt + 1);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
