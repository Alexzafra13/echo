import { Controller, Get, Sse, HttpCode, HttpStatus, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import {
  Observable,
  Subject,
  interval,
  switchMap,
  from,
  takeUntil,
  map,
  startWith,
  merge,
} from 'rxjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { Public } from '@shared/decorators/public.decorator';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports';
import { GetDashboardStatsUseCase } from '../domain/use-cases';
import { GetDashboardStatsResponseDto } from './dtos';
import { ServerMetricsService } from '../infrastructure/services/server-metrics.service';
import type { ServerMetrics } from '../domain/use-cases/get-dashboard-stats/get-dashboard-stats.dto';

const METRICS_INTERVAL_MS = 5000;
const KEEPALIVE_INTERVAL_MS = 30000;

@ApiTags('admin/dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(
    @InjectPinoLogger(AdminDashboardController.name)
    private readonly logger: PinoLogger,
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
    private readonly serverMetricsService: ServerMetricsService,
    private readonly jwtService: JwtService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard statistics (Admin)',
    description:
      'Returns comprehensive dashboard statistics including library stats, storage, health status, enrichment stats, and active alerts. Only accessible by administrators.',
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
    description:
      'Returns quick system health status for header indicator. Only accessible by administrators.',
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

  // ============================================
  // Server Metrics
  // ============================================

  @Get('server-metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get server metrics snapshot (Admin)',
    description:
      'Returns a one-time snapshot of server metrics including process, system, streaming, queue, and database stats.',
  })
  @ApiResponse({ status: 200, description: 'Server metrics retrieved successfully' })
  async getServerMetrics(): Promise<ServerMetrics> {
    return this.serverMetricsService.collect();
  }

  @Sse('server-metrics/stream')
  @Public()
  @ApiOperation({
    summary: 'Stream server metrics in real-time (SSE, Admin)',
    description:
      'Server-Sent Events stream that emits server metrics every 5 seconds. Requires a valid admin JWT token as query parameter.',
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'JWT token for authentication',
    required: true,
  })
  async streamServerMetrics(
    @Query('token') token: string,
    @Req() request: FastifyRequest
  ): Promise<Observable<MessageEvent>> {
    // Validate JWT token
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.userId;
    } catch {
      this.logger.warn('SSE server-metrics connection rejected: invalid token');
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Invalid or expired token' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    // Verify admin status from database (JWT payload doesn't include isAdmin)
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isAdmin) {
      this.logger.warn({ userId }, 'SSE server-metrics connection rejected: not admin');
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          data: { message: 'Admin access required' },
        } as MessageEvent);
        subscriber.complete();
      });
    }

    this.logger.debug({ userId }, 'SSE server-metrics connection established');

    const disconnect$ = new Subject<void>();

    request.raw.on('close', () => {
      this.logger.debug({ userId }, 'SSE server-metrics connection closed');
      disconnect$.next();
      disconnect$.complete();
    });

    // Emit metrics every METRICS_INTERVAL_MS, starting immediately
    const metrics$ = interval(METRICS_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() => from(this.serverMetricsService.collect())),
      map(
        (metrics) =>
          ({
            type: 'server-metrics',
            data: metrics,
          }) as MessageEvent
      )
    );

    // Keepalive every 30s to prevent connection timeout
    const keepalive$ = interval(KEEPALIVE_INTERVAL_MS).pipe(
      map(() => ({ type: 'keepalive', data: {} }) as MessageEvent)
    );

    return merge(metrics$, keepalive$).pipe(takeUntil(disconnect$));
  }
}
