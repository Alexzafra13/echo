import { Module } from '@nestjs/common';
import { SetupController } from './presentation/setup.controller';
import { SetupService } from './application/setup.service';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';

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
 */
@Module({
  imports: [PrismaModule],
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}
