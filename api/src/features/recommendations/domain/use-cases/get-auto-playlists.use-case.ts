import { Injectable, Inject } from '@nestjs/common';
import { IWaveMixGenerator, WAVE_MIX_GENERATOR } from '../ports';
import { AutoPlaylist } from '../entities/track-score.entity';

@Injectable()
export class GetAutoPlaylistsUseCase {
  constructor(
    @Inject(WAVE_MIX_GENERATOR)
    private readonly waveMixService: IWaveMixGenerator,
  ) {}

  async execute(userId: string): Promise<AutoPlaylist[]> {
    return await this.waveMixService.getAllAutoPlaylists(userId);
  }
}
