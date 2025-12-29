import { Injectable, Inject } from '@nestjs/common';
import { PLAY_TRACKING_REPOSITORY, IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { GetArtistTopTracksInput, GetArtistTopTracksOutput } from './get-artist-top-tracks.dto';

/**
 * GetArtistTopTracksUseCase - Get top tracks for an artist
 */
@Injectable()
export class GetArtistTopTracksUseCase {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepository: IPlayTrackingRepository,
  ) {}

  async execute(input: GetArtistTopTracksInput): Promise<GetArtistTopTracksOutput> {
    const limit = Math.min(Math.max(input.limit || 10, 1), 50);
    const days = input.days && input.days > 0 ? input.days : undefined;

    const topTracks = await this.playTrackingRepository.getArtistTopTracks(
      input.artistId,
      limit,
      days,
    );

    return {
      data: topTracks,
      artistId: input.artistId,
      limit,
      days,
    };
  }
}
