import { Injectable, Inject } from '@nestjs/common';
import { IWaveMixGenerator, WAVE_MIX_GENERATOR } from '../ports';
import { AutoPlaylist, WaveMixConfig } from '../entities/track-score.entity';

@Injectable()
export class GenerateWaveMixUseCase {
  constructor(
    @Inject(WAVE_MIX_GENERATOR)
    private readonly waveMixService: IWaveMixGenerator,
  ) {}

  async execute(userId: string, config?: Partial<WaveMixConfig>): Promise<AutoPlaylist> {
    return await this.waveMixService.generateWaveMix(userId, config);
  }
}

// Legacy alias for backwards compatibility
export { GenerateWaveMixUseCase as GenerateDailyMixUseCase };
