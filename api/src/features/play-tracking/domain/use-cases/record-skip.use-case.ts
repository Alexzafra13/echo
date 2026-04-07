import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { PlayEvent, PlayContext } from '../entities/play-event.entity';

@Injectable()
export class RecordSkipUseCase {
  constructor(
    @InjectPinoLogger(RecordSkipUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository
  ) {}

  async execute(
    userId: string,
    trackId: string,
    completionRate: number,
    playContext: PlayContext
  ): Promise<PlayEvent> {
    const playEvent = await this.repository.recordSkip(
      userId,
      trackId,
      completionRate,
      playContext
    );

    // Update aggregated stats so skipCount, avgCompletionRate, and
    // weightedPlayCount reflect actual user skips — not just plays with
    // low completion sent via recordPlay.  Without this, userPlayStats.skipCount
    // stays at 0 for real skips, making the scoring system blind to skip behavior.
    this.repository.updatePlayStats(userId, trackId, playContext, completionRate).catch((err) => {
      this.logger.error(
        { userId, trackId, error: (err as Error).message },
        'Failed to update play stats after skip'
      );
    });

    return playEvent;
  }
}
