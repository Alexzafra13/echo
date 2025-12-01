import { Module, Global } from '@nestjs/common';
import { LogService } from './application/log.service';
import { LogsController } from './presentation/logs.controller';

/**
 * LogsModule
 *
 * Módulo global de logging - disponible en toda la aplicación
 * DrizzleService is provided globally via DrizzleModule
 */
@Global()
@Module({
  controllers: [LogsController],
  providers: [LogService],
  exports: [LogService],
})
export class LogsModule {}
