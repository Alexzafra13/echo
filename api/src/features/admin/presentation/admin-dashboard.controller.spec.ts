import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AdminDashboardController } from './admin-dashboard.controller';
import { GetDashboardStatsUseCase } from '../domain/use-cases';
import { ServerMetricsService } from '../infrastructure/services/server-metrics.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { USER_REPOSITORY } from '@features/auth/domain/ports';
import { getLoggerToken } from 'nestjs-pino';

jest.mock('./dtos', () => ({
  GetDashboardStatsResponseDto: { fromDomain: jest.fn((data) => data) },
}));

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let _getDashboardStatsUseCase: jest.Mocked<GetDashboardStatsUseCase>;

  const mockGetDashboardStatsUseCase = {
    execute: jest.fn(),
  };

  const mockServerMetricsService = {
    collect: jest.fn(),
  };

  const mockUserRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        {
          provide: GetDashboardStatsUseCase,
          useValue: mockGetDashboardStatsUseCase,
        },
        {
          provide: ServerMetricsService,
          useValue: mockServerMetricsService,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: getLoggerToken(AdminDashboardController.name),
          useValue: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
    _getDashboardStatsUseCase = module.get(GetDashboardStatsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should call execute and fromDomain', async () => {
      const mockResult = {
        totalUsers: 1000,
        totalSongs: 5000,
        totalAlbums: 500,
        systemHealth: 'healthy',
        activeAlerts: 0,
      };

      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockResult);

      const { GetDashboardStatsResponseDto } = await import('./dtos');

      const result = await controller.getDashboardStats();

      expect(mockGetDashboardStatsUseCase.execute).toHaveBeenCalledWith({});
      expect(GetDashboardStatsResponseDto.fromDomain).toHaveBeenCalledWith(mockResult);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSystemHealth', () => {
    it('should return systemHealth and activeAlerts from result', async () => {
      const mockResult = {
        totalUsers: 1000,
        totalSongs: 5000,
        totalAlbums: 500,
        systemHealth: 'healthy',
        activeAlerts: 2,
      };

      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockResult);

      const result = await controller.getSystemHealth();

      expect(mockGetDashboardStatsUseCase.execute).toHaveBeenCalledWith({});
      expect(result).toEqual({
        systemHealth: 'healthy',
        activeAlerts: 2,
      });
    });
  });
});
