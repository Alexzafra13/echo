import { Injectable, Inject } from '@nestjs/common';
import { PLAY_TRACKING_REPOSITORY, IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { GetArtistStatsInput, GetArtistStatsOutput } from './get-artist-stats.dto';

/**
 * GetArtistStatsUseCase - Get global statistics for an artist
 */
@Injectable()
export class GetArtistStatsUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepository: IPlayTrackingRepository,
  ) {}

  async execute(input: GetArtistStatsInput): Promise<GetArtistStatsOutput> {
    const stats = await this.playTrackingRepository.getArtistGlobalStats(input.artistId);

    return {
      artistId: input.artistId,
      totalPlays: stats.totalPlays,
      uniqueListeners: stats.uniqueListeners,
      avgCompletionRate: Math.round(stats.avgCompletionRate * 100) / 100,
      skipRate: Math.round(stats.skipRate * 100) / 100,
    };
  }
}
