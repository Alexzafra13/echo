import { Injectable, Inject } from '@nestjs/common';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { PlayEvent } from '../entities/play-event.types';

@Injectable()
export class GetUserPlayHistoryUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
  ) {}

  async execute(userId: string, limit?: number, offset?: number): Promise<PlayEvent[]> {
    return await this.repository.getUserPlayHistory(userId, limit, offset);
  }
}
