import { Injectable } from '@nestjs/common';
import { SmartPlaylistService } from '../services/smart-playlist.service';
import { SmartPlaylistConfig, TrackScore } from '../entities/track-score.types';

@Injectable()
export class GenerateSmartPlaylistUseCase {
  constructor(private readonly smartPlaylistService: SmartPlaylistService) {}

  async execute(userId: string, config: SmartPlaylistConfig): Promise<{ tracks: TrackScore[]; metadata: any }> {
    return await this.smartPlaylistService.generateSmartPlaylist(userId, config);
  }
}
