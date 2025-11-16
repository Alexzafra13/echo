import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { UserInteractionsModule } from '@features/user-interactions/user-interactions.module';
import { PlayTrackingModule } from '@features/play-tracking/play-tracking.module';
import { ScoringService } from './domain/services/scoring.service';
import { WaveMixService } from './domain/services/wave-mix.service';
import { SmartPlaylistService } from './domain/services/smart-playlist.service';
import {
  CalculateTrackScoreUseCase,
  GenerateWaveMixUseCase,
  GenerateDailyMixUseCase,
  GenerateSmartPlaylistUseCase,
  GetAutoPlaylistsUseCase,
} from './domain/use-cases';
import { RecommendationsController } from './presentation/controller/recommendations.controller';

@Module({
  imports: [UserInteractionsModule, PlayTrackingModule],
  controllers: [RecommendationsController],
  providers: [
    PrismaService,
    ScoringService,
    WaveMixService,
    SmartPlaylistService,
    CalculateTrackScoreUseCase,
    GenerateWaveMixUseCase,
    {
      provide: GenerateDailyMixUseCase,
      useClass: GenerateWaveMixUseCase, // Alias for backwards compatibility
    },
    GenerateSmartPlaylistUseCase,
    GetAutoPlaylistsUseCase,
  ],
  exports: [ScoringService, WaveMixService, SmartPlaylistService],
})
export class RecommendationsModule {}
