import { Injectable, Inject } from '@nestjs/common';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { PlayEvent, PlayContext } from '../entities/play-event.types';

@Injectable()
export class RecordSkipUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
  ) {}

  async execute(
    userId: string,
    trackId: string,
    completionRate: number,
    playContext: PlayContext,
  ): Promise<PlayEvent> {
    return await this.repository.recordSkip(userId, trackId, completionRate, playContext);
  }
}
