import { Injectable, Inject } from '@nestjs/common';
import {
  MUSIC_VIDEO_REPOSITORY,
  IMusicVideoRepository,
} from '../../domain/ports/music-video-repository.port';

/**
 * Service to enrich track DTOs with videoId.
 * Used by multiple controllers (albums, playlists, tracks) to avoid duplication.
 */
@Injectable()
export class VideoEnrichmentService {
  constructor(
    @Inject(MUSIC_VIDEO_REPOSITORY)
    private readonly repository: IMusicVideoRepository
  ) {}

  /**
   * Get a Map of trackId → videoId for a list of track IDs.
   */
  async getVideoIdsByTrackIds(trackIds: string[]): Promise<Map<string, string>> {
    return this.repository.getVideoIdsByTrackIds(trackIds);
  }

  /**
   * Enrich an array of track DTOs with videoId field.
   * Mutates the DTOs in place.
   */
  async enrichTracksWithVideoIds<T extends { id: string; videoId?: string }>(
    tracks: T[]
  ): Promise<void> {
    if (tracks.length === 0) return;
    const videoMap = await this.repository.getVideoIdsByTrackIds(tracks.map((t) => t.id));
    for (const track of tracks) {
      track.videoId = videoMap.get(track.id);
    }
  }
}
