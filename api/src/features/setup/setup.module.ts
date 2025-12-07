import { Module } from '@nestjs/common';
import { SetupController } from './presentation/setup.controller';
import { SetupService } from './application/setup.service';
import {
  DirectoryBrowserService,
  MusicLibraryDetectorService,
} from './application/services';

/**
 * Setup Module
 *
 * Handles first-run setup wizard (Jellyfin-style):
 * - Check if setup is needed
 * - Create admin account
 * - Configure music library path
 * - Complete setup
 *
 * All endpoints are PUBLIC (no auth required) but only work
 * when setup is not completed.
 *
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  controllers: [SetupController],
  providers: [
    SetupService,
    DirectoryBrowserService,
    MusicLibraryDetectorService,
  ],
  exports: [SetupService],
})
export class SetupModule {}
