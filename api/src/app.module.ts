import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { LoggingInterceptor, CacheControlInterceptor } from './shared/interceptors';
import { DrizzleModule } from './infrastructure/database/drizzle.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { FilesystemModule } from './infrastructure/filesystem/filesystem.module';
import { WebSocketModule } from './infrastructure/websocket';

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
import { DjModule } from './features/dj/dj.module';
import { ExploreModule } from './features/explore/explore.module';
import { LogsModule } from './features/logs/logs.module';
import { HealthModule } from './features/health/health.module';
import { SetupModule } from './features/setup/setup.module';
import { PublicProfilesModule } from './features/public-profiles/public-profiles.module';
import { SocialModule } from './features/social/social.module';
import { FederationModule } from './features/federation/federation.module';
import { validateEnvironment } from './config/env.validation';
import { SecuritySecretsModule } from './config/security-secrets.module';
import { sanitizeQueryParams, sanitizeParams } from '@shared/utils/log-sanitizer.util';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                singleLine: false,
              },
            }
          : undefined,
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        serializers: {
          req: (req: any) => ({
            method: req.method,
            url: req.url,
            params: sanitizeParams(req.params),
            query: sanitizeQueryParams(req.query),
          }),
          res: (res: any) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),

    // Rate limiting: 300 req/min por IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 300,
    }]),

    ScheduleModule.forRoot(),

    DrizzleModule,
    SecuritySecretsModule,
    CacheModule,
    QueueModule,
    FilesystemModule,
    WebSocketModule,
    LogsModule,

    SetupModule,
    HealthModule,
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
    DjModule,
    ExploreModule,
    PublicProfilesModule,
    SocialModule,
    FederationModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
  ],
})
export class AppModule {}