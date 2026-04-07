import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { AlbumsModule } from '@features/albums/albums.module';
import { StreamingController } from './presentation/streaming.controller';
import { StreamTokenController } from './presentation/stream-token.controller';
import { DownloadController } from './presentation/download.controller';
import { StreamTrackUseCase } from './domain/use-cases';
import { StreamTokenGuard } from './presentation/guards';
import { StreamTokenService } from './infrastructure/services/stream-token.service';
import { StreamTokenCleanupService } from './infrastructure/services/stream-token-cleanup.service';
import { DownloadService } from './infrastructure/services/download.service';
import { ActiveStreamsTracker } from './infrastructure/services/active-streams.tracker';

@Module({
  imports: [TracksModule, AlbumsModule],
  controllers: [StreamingController, StreamTokenController, DownloadController],
  providers: [
    StreamTrackUseCase,
    StreamTokenService,
    StreamTokenGuard,
    StreamTokenCleanupService,
    DownloadService,
    ActiveStreamsTracker,
  ],
  exports: [StreamTokenService, ActiveStreamsTracker],
})
export class StreamingModule {}
