import { Injectable } from '@nestjs/common';
import { WaveMixService } from '../../infrastructure/services/wave-mix.service';
import { AutoPlaylist, WaveMixConfig } from '../entities/track-score.entity';

@Injectable()
export class GenerateWaveMixUseCase {
  constructor(private readonly waveMixService: WaveMixService) {}

  async execute(userId: string, config?: Partial<WaveMixConfig>): Promise<AutoPlaylist> {
    return await this.waveMixService.generateWaveMix(userId, config);
  }
}

// Legacy alias for backwards compatibility
export { GenerateWaveMixUseCase as GenerateDailyMixUseCase };
