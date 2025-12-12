import { Injectable, Inject } from '@nestjs/common';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { UserPlaySummary } from '../entities/play-event.types';

@Injectable()
export class GetUserPlaySummaryUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
  ) {}

  async execute(userId: string, days: number = 30): Promise<UserPlaySummary> {
    return await this.repository.getUserPlaySummary(userId, days);
  }
}
