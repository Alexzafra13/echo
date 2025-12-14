import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Sse,
  Req,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { GetDashboardStatsUseCase } from '../domain/use-cases';
import { SystemHealthEventsService, HealthChangeEvent } from '../domain/services';
import { GetDashboardStatsResponseDto } from './dtos';

@ApiTags('admin/dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
    private readonly systemHealthEventsService: SystemHealthEventsService,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard statistics (Admin)',
    description: 'Returns comprehensive dashboard statistics including library stats, storage, health status, enrichment stats, and active alerts. Only accessible by administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: GetDashboardStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'No admin permissions',
  })
  async getDashboardStats(): Promise<GetDashboardStatsResponseDto> {
    const result = await this.getDashboardStatsUseCase.execute({});
    return GetDashboardStatsResponseDto.fromDomain(result);
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get system health status (Admin)',
    description: 'Returns quick system health status for header indicator. Only accessible by administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'No admin permissions',
  })
  async getSystemHealth() {
    const result = await this.getDashboardStatsUseCase.execute({});
    return {
      systemHealth: result.systemHealth,
      activeAlerts: result.activeAlerts,
    };
  }

  @Sse('health/stream')
  @ApiOperation({
    summary: 'Stream system health updates (SSE)',
    description: 'Real-time Server-Sent Events stream for system health changes. Sends events when database, redis, storage, or scanner status changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
  })
  streamHealthUpdates(@Req() request: FastifyRequest): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      // Send initial health state
      this.systemHealthEventsService.getCurrentHealth().then((health) => {
        subscriber.next({
          type: 'health:initial',
          data: {
            ...health,
            timestamp: new Date().toISOString(),
          },
        } as MessageEvent);
      });

      // Subscribe to health changes
      const handleEvent = (event: HealthChangeEvent) => {
        subscriber.next({
          type: event.type,
          data: event.data,
        } as MessageEvent);
      };

      const unsubscribe = this.systemHealthEventsService.subscribe(handleEvent);

      // Keepalive every 15 seconds to prevent connection timeout
      // Browser/proxy default timeout is ~24-25 seconds, so 15s gives us safe margin
      const keepaliveInterval = setInterval(() => {
        subscriber.next({
          type: 'keepalive',
          data: { timestamp: Date.now() },
        } as MessageEvent);
      }, 15000);

      // Cleanup on disconnect
      request.raw.on('close', () => {
        unsubscribe();
        clearInterval(keepaliveInterval);
        subscriber.complete();
      });
    });
  }
}
