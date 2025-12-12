import { Injectable } from '@nestjs/common';
import { WaveMixService } from '../services/wave-mix.service';
import { AutoPlaylist } from '../entities/track-score.types';

@Injectable()
export class GetAutoPlaylistsUseCase {
  constructor(private readonly waveMixService: WaveMixService) {}

  async execute(userId: string): Promise<AutoPlaylist[]> {
    return await this.waveMixService.getAllAutoPlaylists(userId);
  }
}
