import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheckResult, LivenessResult, ReadinessResult } from './health-check.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@Controller('health')
@SkipThrottle() // Health checks should never be rate limited
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  /**
   * Full health check with all services and metrics
   * Use for monitoring dashboards
   */
  @Get()
  @ApiOperation({
    summary: 'Full health check',
    description: 'Returns the health status of the application and its dependencies (database, cache, etc.) with system metrics'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy or degraded (cache down but app works)',
    schema: {
      example: {
        status: 'ok',
        timestamp: 1700000000000,
        uptime: 12345,
        version: '1.0.0',
        services: {
          database: 'ok',
          cache: 'ok'
        },
        system: {
          memory: { total: 8192, free: 4096, used: 4096, usagePercent: 50 },
          cpu: { loadAverage: [0.5, 0.4, 0.3] }
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy (database down)',
    schema: {
      example: {
        status: 'error',
        timestamp: 1700000000000,
        uptime: 12345,
        version: '1.0.0',
        services: {
          database: 'error',
          cache: 'ok'
        },
        error: 'Database connection failed'
      }
    }
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check();
  }

  /**
   * Kubernetes liveness probe
   * Fast check - just confirms the process is running
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Kubernetes liveness probe - returns 200 if the process is alive. Use for pod restart decisions.'
  })
  @ApiResponse({
    status: 200,
    description: 'Process is alive',
    schema: {
      example: {
        status: 'ok',
        timestamp: 1700000000000
      }
    }
  })
  async liveness(): Promise<LivenessResult> {
    return this.healthCheckService.liveness();
  }

  /**
   * Kubernetes readiness probe
   * Checks if the service can handle traffic
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Kubernetes readiness probe - returns 200 if the service can handle traffic. Checks critical dependencies only (database).'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
    schema: {
      example: {
        status: 'ok',
        timestamp: 1700000000000,
        services: {
          database: 'ok',
          cache: 'ok'
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready (critical dependencies unavailable)',
    schema: {
      example: {
        status: 'error',
        timestamp: 1700000000000,
        services: {
          database: 'error',
          cache: 'ok'
        }
      }
    }
  })
  async readiness(): Promise<ReadinessResult> {
    return this.healthCheckService.readiness();
  }
}
