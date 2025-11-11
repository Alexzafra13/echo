import { Injectable } from '@nestjs/common';
import { DailyMixService } from '../services/daily-mix.service';
import { DailyMix, DailyMixConfig } from '../entities/track-score.entity';

@Injectable()
export class GenerateDailyMixUseCase {
  constructor(private readonly dailyMixService: DailyMixService) {}

  async execute(userId: string, config?: Partial<DailyMixConfig>): Promise<DailyMix> {
    return await this.dailyMixService.generateDailyMix(userId, config);
  }
}
