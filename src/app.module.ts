import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { FilesystemModule } from './infrastructure/filesystem/filesystem.module';
import { AuthModule } from './features/auth/auth.module';
import { AlbumsModule } from './features/albums/albums.module';

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
    // TracksModule,
    AlbumsModule,
    // ArtistsModule,
    // PlaylistsModule,
    // StreamingModule,
    // ScannerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}