import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { GetDashboardStatsUseCase } from '../domain/use-cases';
import { GetDashboardStatsResponseDto } from './dtos';

@ApiTags('admin/dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
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
}
