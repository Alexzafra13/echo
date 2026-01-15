import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';

/**
 * HealthModule
 *
 * Provides health check endpoints for:
 * - GET /health - Full health check with system metrics
 * - GET /health/live - Kubernetes liveness probe
 * - GET /health/ready - Kubernetes readiness probe
 *
 * Dependencies:
 * - DrizzleService is provided globally via DrizzleModule
 * - RedisService is provided via CacheModule
 * - SettingsService is provided via ExternalMetadataModule (for storage path)
 */
@Module({
  imports: [CacheModule, ExternalMetadataModule],
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}
