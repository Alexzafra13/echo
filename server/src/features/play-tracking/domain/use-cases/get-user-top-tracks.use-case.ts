import { Injectable, Inject } from '@nestjs/common';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';

export interface TopTrack {
  trackId: string;
  playCount: number;
  weightedPlayCount: number;
}

@Injectable()
export class GetUserTopTracksUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
  ) {}

  async execute(userId: string, limit: number = 50, days?: number): Promise<TopTrack[]> {
    return await this.repository.getUserTopTracks(userId, limit, days);
  }
}
