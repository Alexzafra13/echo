import { Injectable, Inject } from '@nestjs/common';
import { ISmartPlaylistGenerator, SMART_PLAYLIST_GENERATOR } from '../ports';
import { SmartPlaylistConfig, TrackScore } from '../entities/track-score.entity';

@Injectable()
export class GenerateSmartPlaylistUseCase {
  constructor(
    @Inject(SMART_PLAYLIST_GENERATOR)
    private readonly smartPlaylistService: ISmartPlaylistGenerator,
  ) {}

  async execute(userId: string, config: SmartPlaylistConfig): Promise<{ tracks: TrackScore[]; metadata: any }> {
    return await this.smartPlaylistService.generateSmartPlaylist(userId, config);
  }
}
