import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheckResult } from './health-check.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@Controller('health')
@SkipThrottle() // Health checks should never be rate limited
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the health status of the application and its dependencies'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: 1700000000000,
        uptime: 12345,
        version: '1.0.0',
        services: {
          database: 'ok',
          cache: 'ok'
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy (database down)',
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check();
  }
}
