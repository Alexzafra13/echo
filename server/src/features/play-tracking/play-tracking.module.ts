import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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

@Module({
  controllers: [PlayTrackingController],
  providers: [
    PrismaService,
    RedisService,
    PrismaPlayTrackingRepository, // Base repository
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
