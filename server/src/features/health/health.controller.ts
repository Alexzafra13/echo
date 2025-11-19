import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from './health-check.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the application and its dependencies (database, cache, etc.)'
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
    description: 'Service is unhealthy',
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
  async check() {
    return this.healthCheckService.check();
  }
}
