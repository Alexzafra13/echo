import { Module, Global, forwardRef } from '@nestjs/common';
import { LogService } from './application/log.service';
import { LogCleanupService } from './application/log-cleanup.service';
import { LogsController } from './presentation/logs.controller';
import { ExternalMetadataModule } from '../external-metadata/external-metadata.module';

/**
 * LogsModule
 *
 * Módulo global de logging - disponible en toda la aplicación
 * DrizzleService is provided globally via DrizzleModule
 *
 * Features:
 * - Centralized logging with severity levels and categories
 * - Automatic cleanup of old logs (configurable via LOG_RETENTION_DAYS)
 */
@Global()
@Module({
  imports: [forwardRef(() => ExternalMetadataModule)],
  controllers: [LogsController],
  providers: [LogService, LogCleanupService],
  exports: [LogService],
})
export class LogsModule {}
