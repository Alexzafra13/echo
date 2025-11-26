import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';

/**
 * HealthModule
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}
