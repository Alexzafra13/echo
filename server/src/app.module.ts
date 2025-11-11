import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { FilesystemModule } from './infrastructure/filesystem/filesystem.module';
import { WebSocketModule } from './infrastructure/websocket';

// Features
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { AdminModule } from './features/admin/admin.module';
import { AlbumsModule } from './features/albums/albums.module';
import { TracksModule } from './features/tracks/tracks.module';
import { ArtistsModule } from './features/artists/artists.module';
import { StreamingModule } from './features/streaming/streaming.module';
import { PlaylistsModule } from './features/playlists/playlists.module';
import { ScannerModule } from './features/scanner/scanner.module';
import { ExternalMetadataModule } from './features/external-metadata/external-metadata.module';
import { RadioModule } from './features/radio/radio.module';
import { UserInteractionsModule } from './features/user-interactions/user-interactions.module';
import { PlayTrackingModule } from './features/play-tracking/play-tracking.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Global Infrastructure
    PrismaModule,
    CacheModule,
    QueueModule,
    FilesystemModule,
    WebSocketModule,

    // Features
    AuthModule,
    UsersModule,
    AdminModule,
    AlbumsModule,
    TracksModule,
    ArtistsModule,
    StreamingModule,
    PlaylistsModule,
    ScannerModule,
    ExternalMetadataModule,
    RadioModule,
    UserInteractionsModule,
    PlayTrackingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}