import { Module, Global } from '@nestjs/common';
import { LogService } from './application/log.service';
import { LogsController } from './presentation/logs.controller';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

/**
 * LogsModule
 *
 * Módulo global de logging - disponible en toda la aplicación
 */
@Global()
@Module({
  controllers: [LogsController],
  providers: [LogService, PrismaService],
  exports: [LogService],
})
export class LogsModule {}
