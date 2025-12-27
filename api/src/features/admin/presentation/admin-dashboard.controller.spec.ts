import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardController } from './admin-dashboard.controller';
import { GetDashboardStatsUseCase } from '../domain/use-cases';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let mockGetDashboardStatsUseCase: MockUseCase;

  const mockDashboardStats = {
    libraryStats: {
      totalArtists: 150,
      totalAlbums: 500,
      totalTracks: 5000,
      totalSize: 50000000000, // 50 GB
      totalDuration: 1000000, // seconds
    },
    storageBreakdown: {
      totalSize: 100000000000, // 100 GB
      freeSize: 50000000000, // 50 GB
      usedSize: 50000000000, // 50 GB
      usagePercent: 50,
      musicSize: 45000000000,
      cacheSize: 5000000000,
    },
    systemHealth: {
      status: 'healthy',
      database: 'ok',
      cache: 'ok',
      storage: 'ok',
      cpu: 45,
      memory: 60,
    },
    enrichmentStats: {
      totalEnriched: 4500,
      totalPending: 500,
      totalFailed: 0,
      completionPercent: 90,
    },
    activityStats: {
      totalPlays: 10000,
      uniqueListeners: 25,
      avgPlaysPerDay: 100,
    },
    scanStats: {
      lastScanDate: new Date().toISOString(),
      lastScanDuration: 300, // 5 minutes
      tracksScanned: 5000,
      newTracksFound: 50,
    },
    activeAlerts: [
      {
        id: 'alert-1',
        type: 'warning',
        message: 'Storage usage above 80%',
      },
    ],
    activityTimeline: [
      { date: '2024-01-01', plays: 100 },
      { date: '2024-01-02', plays: 120 },
    ],
    recentActivities: [
      {
        type: 'play',
        trackTitle: 'Song 1',
        username: 'user1',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  beforeEach(async () => {
    mockGetDashboardStatsUseCase = createMockUseCase();

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
  });

  describe('GET /admin/dashboard/stats - getDashboardStats', () => {
    it('debería retornar estadísticas completas del dashboard', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getDashboardStats();

      // Assert
      expect(mockGetDashboardStatsUseCase.execute).toHaveBeenCalledWith({});
      expect(result).toBeDefined();
    });

    it('debería incluir estadísticas de librería', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getDashboardStats();

      // Assert
      expect(result.libraryStats).toBeDefined();
    });

    it('debería incluir desglose de almacenamiento', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getDashboardStats();

      // Assert
      expect(result.storageBreakdown).toBeDefined();
    });

    it('debería incluir estado de salud del sistema', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getDashboardStats();

      // Assert
      expect(result.systemHealth).toBeDefined();
    });

    it('debería incluir estadísticas de enrichment', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getDashboardStats();

      // Assert
      expect(result.enrichmentStats).toBeDefined();
    });

    it('debería incluir alertas activas', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getDashboardStats();

      // Assert
      expect(result.activeAlerts).toBeDefined();
      expect(Array.isArray(result.activeAlerts)).toBe(true);
    });

    it('debería propagar error del use case', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockRejectedValue(
        new Error('Failed to get dashboard stats')
      );

      // Act & Assert
      await expect(controller.getDashboardStats()).rejects.toThrow(
        'Failed to get dashboard stats'
      );
    });
  });

  describe('GET /admin/dashboard/health - getSystemHealth', () => {
    it('debería retornar solo información de salud del sistema', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(mockDashboardStats);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(result.systemHealth).toBeDefined();
      expect(result.activeAlerts).toBeDefined();
      // No debería incluir otras estadísticas
      expect(result).not.toHaveProperty('libraryStats');
      expect(result).not.toHaveProperty('storageBreakdown');
    });

    it('debería incluir alertas activas en respuesta de salud', async () => {
      // Arrange
      const statsWithAlerts = {
        ...mockDashboardStats,
        activeAlerts: [
          { id: 'alert-1', type: 'critical', message: 'Database connection issues' },
          { id: 'alert-2', type: 'warning', message: 'High CPU usage' },
        ],
      };
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(statsWithAlerts);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(result.activeAlerts).toHaveLength(2);
    });

    it('debería retornar lista vacía de alertas cuando no hay alertas', async () => {
      // Arrange
      const statsNoAlerts = {
        ...mockDashboardStats,
        activeAlerts: [],
      };
      mockGetDashboardStatsUseCase.execute.mockResolvedValue(statsNoAlerts);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(result.activeAlerts).toHaveLength(0);
    });

    it('debería propagar error del use case', async () => {
      // Arrange
      mockGetDashboardStatsUseCase.execute.mockRejectedValue(
        new Error('Health check failed')
      );

      // Act & Assert
      await expect(controller.getSystemHealth()).rejects.toThrow(
        'Health check failed'
      );
    });
  });
});
