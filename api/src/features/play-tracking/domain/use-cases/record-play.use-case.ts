import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
    @InjectPinoLogger(RecordPlayUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
    private readonly statsCalculator: PlayStatsCalculatorService
  ) {}

  async execute(input: RecordPlayInput): Promise<PlayEvent> {
    const completionRate = input.completionRate ?? 1.0;
    const skipped = this.statsCalculator.isSkipped(completionRate);

    this.logger.debug(
      {
        userId: input.userId,
        trackId: input.trackId,
        completionRate,
        playContext: input.playContext,
      },
      'Recording play event'
    );

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

    // Actualizar stats agregadas de forma asíncrona (fire-and-forget)
    // Si falla, las stats se recalcularán en el siguiente play exitoso
    this.repository
      .updatePlayStats(input.userId, input.trackId, input.playContext, completionRate)
      .catch((err) => {
        this.logger.error(
          {
            userId: input.userId,
            trackId: input.trackId,
            error: err.message,
          },
          'Failed to update play stats (non-blocking)'
        );
      });

    return playEvent;
  }
}
