import { Module } from '@nestjs/common';
import { MusicVideosController } from './presentation/controller/music-videos.controller';
import { StreamMusicVideoUseCase } from './domain/use-cases/stream-music-video.use-case';
import { GetMusicVideoUseCase } from './domain/use-cases/get-music-video.use-case';
import { DrizzleMusicVideoRepository } from './infrastructure/persistence/drizzle-music-video.repository';
import { MUSIC_VIDEO_REPOSITORY } from './domain/ports/music-video-repository.port';
import { VideoEnrichmentService } from './infrastructure/services/video-enrichment.service';
import { StreamTokenService } from '@features/streaming/infrastructure/services/stream-token.service';
import { StreamTokenGuard } from '@features/streaming/presentation/guards';

@Module({
  controllers: [MusicVideosController],
  providers: [
    { provide: MUSIC_VIDEO_REPOSITORY, useClass: DrizzleMusicVideoRepository },
    StreamMusicVideoUseCase,
    GetMusicVideoUseCase,
    VideoEnrichmentService,
    StreamTokenService,
    StreamTokenGuard,
  ],
  exports: [MUSIC_VIDEO_REPOSITORY, VideoEnrichmentService],
})
export class MusicVideosModule {}
