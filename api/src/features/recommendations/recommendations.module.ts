import { Module } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { UserInteractionsModule } from '@features/user-interactions/user-interactions.module';
import { PlayTrackingModule } from '@features/play-tracking/play-tracking.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { TracksModule } from '@features/tracks/tracks.module';
import { ScoringService } from './domain/services/scoring.service';
import { WaveMixService } from './infrastructure/services/wave-mix.service';
import { SmartPlaylistService } from './infrastructure/services/smart-playlist.service';
import { PlaylistShuffleService } from './domain/services/playlists';
import { PlaylistCoverService } from './infrastructure/services/playlists/playlist-cover.service';
import { ArtistPlaylistService } from './infrastructure/services/playlists/artist-playlist.service';
import { GenrePlaylistService } from './infrastructure/services/playlists/genre-playlist.service';
import {
  CalculateTrackScoreUseCase,
  GenerateWaveMixUseCase,
  GenerateDailyMixUseCase,
  GenerateSmartPlaylistUseCase,
  GetAutoPlaylistsUseCase,
} from './domain/use-cases';
import { RecommendationsController } from './presentation/controller/recommendations.controller';
import { WaveMixSchedulerService } from './infrastructure/jobs/wave-mix-scheduler.service';

/**
 * RecommendationsModule
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  imports: [CacheModule, UserInteractionsModule, PlayTrackingModule, ExternalMetadataModule, TracksModule],
  controllers: [RecommendationsController],
  providers: [
    // Core Services
    ScoringService,
    WaveMixService,
    SmartPlaylistService,
    WaveMixSchedulerService,

    // Playlist Services (SRP extraction)
    PlaylistShuffleService,
    PlaylistCoverService,
    ArtistPlaylistService,
    GenrePlaylistService,
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
