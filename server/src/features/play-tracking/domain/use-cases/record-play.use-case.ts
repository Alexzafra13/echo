import { Injectable, Inject } from '@nestjs/common';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { PlayEvent, PlayContext, SourceType } from '../entities/play-event.entity';
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
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
    private readonly statsCalculator: PlayStatsCalculatorService,
  ) {}

  async execute(input: RecordPlayInput): Promise<PlayEvent> {
    const completionRate = input.completionRate ?? 1.0; // Default to full completion
    const skipped = this.statsCalculator.isSkipped(completionRate);

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

    // Update aggregated stats asynchronously (don't wait)
    this.repository.updatePlayStats(
      input.userId,
      input.trackId,
      input.playContext,
      completionRate,
    ).catch(err => {
      console.error('Error updating play stats:', err);
    });

    return playEvent;
  }
}
