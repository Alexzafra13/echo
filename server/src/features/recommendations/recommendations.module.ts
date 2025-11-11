import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { UserInteractionsModule } from '@features/user-interactions/user-interactions.module';
import { PlayTrackingModule } from '@features/play-tracking/play-tracking.module';
import { ScoringService } from './domain/services/scoring.service';
import { DailyMixService } from './domain/services/daily-mix.service';
import { SmartPlaylistService } from './domain/services/smart-playlist.service';
import {
  CalculateTrackScoreUseCase,
  GenerateDailyMixUseCase,
  GenerateSmartPlaylistUseCase,
} from './domain/use-cases';
import { RecommendationsController } from './presentation/controller/recommendations.controller';

@Module({
  imports: [UserInteractionsModule, PlayTrackingModule],
  controllers: [RecommendationsController],
  providers: [
    PrismaService,
    ScoringService,
    DailyMixService,
    SmartPlaylistService,
    CalculateTrackScoreUseCase,
    GenerateDailyMixUseCase,
    GenerateSmartPlaylistUseCase,
  ],
  exports: [ScoringService, DailyMixService, SmartPlaylistService],
})
export class RecommendationsModule {}
