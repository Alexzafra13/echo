import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { FilesystemModule } from './infrastructure/filesystem/filesystem.module';

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

    // Features (irán aquí)
    // AuthModule,
    // TracksModule,
    // AlbumsModule,
    // ArtistsModule,
    // PlaylistsModule,
    // StreamingModule,
    // ScannerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}