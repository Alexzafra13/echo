import { Module } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { PLAY_TRACKING_REPOSITORY } from './domain/ports';
import { PrismaPlayTrackingRepository } from './infrastructure/persistence/play-tracking.repository';
import { CachedPlayTrackingRepository } from './infrastructure/persistence/cached-play-tracking.repository';
import { PlayStatsCalculatorService } from './domain/services/play-stats-calculator.service';
import {
  RecordPlayUseCase,
  RecordSkipUseCase,
  GetUserPlayHistoryUseCase,
  GetUserTopTracksUseCase,
  GetRecentlyPlayedUseCase,
  GetUserPlaySummaryUseCase,
} from './domain/use-cases';
import { PlayTrackingController } from './presentation/controller/play-tracking.controller';

/**
 * PlayTrackingModule
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  controllers: [PlayTrackingController],
  providers: [
    RedisService,
    PrismaPlayTrackingRepository, // Base repository (uses Drizzle internally)
    {
      provide: PLAY_TRACKING_REPOSITORY,
      useClass: CachedPlayTrackingRepository, // Use cached wrapper
    },
    PlayStatsCalculatorService,
    RecordPlayUseCase,
    RecordSkipUseCase,
    GetUserPlayHistoryUseCase,
    GetUserTopTracksUseCase,
    GetRecentlyPlayedUseCase,
    GetUserPlaySummaryUseCase,
  ],
  exports: [PLAY_TRACKING_REPOSITORY, PlayStatsCalculatorService],
})
export class PlayTrackingModule {}
