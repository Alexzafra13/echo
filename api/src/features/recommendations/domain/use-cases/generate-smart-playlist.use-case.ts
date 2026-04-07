import { Injectable, Inject } from '@nestjs/common';
import { ISmartPlaylistGenerator, SMART_PLAYLIST_GENERATOR, SmartPlaylistResult } from '../ports';
import { SmartPlaylistConfig } from '../entities/track-score.entity';

@Injectable()
export class GenerateSmartPlaylistUseCase {
  constructor(
    @Inject(SMART_PLAYLIST_GENERATOR)
    private readonly smartPlaylistService: ISmartPlaylistGenerator,
  ) {}

  async execute(userId: string, config: SmartPlaylistConfig): Promise<SmartPlaylistResult> {
    return await this.smartPlaylistService.generateSmartPlaylist(userId, config);
  }
}
