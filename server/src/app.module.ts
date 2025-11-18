import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
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
import { RecommendationsModule } from './features/recommendations/recommendations.module';
import { LogsModule } from './features/logs/logs.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Pino Logger
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                singleLine: true,
              },
            }
          : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        serializers: {
          req: (req: any) => ({
            method: req.method,
            url: req.url,
            params: req.params,
            query: req.query,
          }),
          res: (res: any) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),

    // Rate Limiting (protección contra fuerza bruta y DoS)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 segundos
      limit: 100, // 100 requests por minuto (general)
    }]),

    // Global Infrastructure
    PrismaModule,
    CacheModule,
    QueueModule,
    FilesystemModule,
    WebSocketModule,
    LogsModule,

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
    RecommendationsModule,
  ],
  controllers: [],
  providers: [
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}