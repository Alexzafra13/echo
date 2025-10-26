import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { FilesystemModule } from './infrastructure/filesystem/filesystem.module';

// Features
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { AdminModule } from './features/admin/admin.module';
import { AlbumsModule } from './features/albums/albums.module';
import { TracksModule } from './features/tracks/tracks.module';
import { ArtistsModule } from './features/artists/artists.module';
import { StreamingModule } from './features/streaming/streaming.module';

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

    // Features
    AuthModule,
    UsersModule,
    AdminModule,
    AlbumsModule,
    TracksModule,
    ArtistsModule,
    StreamingModule,
    // PlaylistsModule,
    // ScannerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}