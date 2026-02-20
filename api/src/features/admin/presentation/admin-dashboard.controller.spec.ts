import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardController } from './admin-dashboard.controller';
import { GetDashboardStatsUseCase } from '../domain/use-cases';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';

jest.mock('./dtos', () => ({
  GetDashboardStatsResponseDto: { fromDomain: jest.fn((data) => data) },
}));

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let getDashboardStatsUseCase: jest.Mocked<GetDashboardStatsUseCase>;

  const mockGetDashboardStatsUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        {
          provide: GetDashboardStatsUseCase,
          useValue: mockGetDashboardStatsUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
    getDashboardStatsUseCase = module.get(GetDashboardStatsUseCase);
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
