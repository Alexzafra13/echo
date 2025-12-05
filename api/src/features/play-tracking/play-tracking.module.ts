import { Module } from '@nestjs/common';
import { PLAY_TRACKING_REPOSITORY } from './domain/ports';
import { DrizzlePlayTrackingRepository } from './infrastructure/persistence/play-tracking.repository';
import { CachedPlayTrackingRepository } from './infrastructure/persistence/cached-play-tracking.repository';
import { PlayStatsCalculatorService } from './domain/services/play-stats-calculator.service';
import {
  RecordPlayUseCase,
  RecordSkipUseCase,
  GetUserPlayHistoryUseCase,
  GetUserTopTracksUseCase,
  GetRecentlyPlayedUseCase,
  GetUserPlaySummaryUseCase,
  UpdatePlaybackStateUseCase,
} from './domain/use-cases';
import { PlayTrackingController } from './presentation/controller/play-tracking.controller';

/**
 * PlayTrackingModule
 *
 * Note: RedisService is available globally via CacheModule (@Global),
 * so it doesn't need to be imported or provided here.
 * DrizzleService is also provided globally via DrizzleModule.
 */
@Module({
  controllers: [PlayTrackingController],
  providers: [
    DrizzlePlayTrackingRepository, // Base repository
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
    UpdatePlaybackStateUseCase,
  ],
  exports: [PLAY_TRACKING_REPOSITORY, PlayStatsCalculatorService],
})
export class PlayTrackingModule {}
