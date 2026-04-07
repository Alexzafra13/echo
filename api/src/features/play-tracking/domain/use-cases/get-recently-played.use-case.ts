import { Injectable, Inject } from '@nestjs/common';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';

@Injectable()
export class GetRecentlyPlayedUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
  ) {}

  async execute(userId: string, limit: number = 20): Promise<string[]> {
    return await this.repository.getRecentlyPlayed(userId, limit);
  }
}
