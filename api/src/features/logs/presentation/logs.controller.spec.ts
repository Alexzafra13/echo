import { Test, TestingModule } from '@nestjs/testing';
import { LogsController } from './logs.controller';
import { LogService, LogLevel, LogCategory } from '../application/log.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';

describe('LogsController', () => {
  let controller: LogsController;
  let mockLogService: jest.Mocked<LogService>;

  beforeEach(async () => {
    mockLogService = {
      getLogs: jest.fn(),
      getLogStats: jest.fn(),
      critical: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      cleanupOldLogs: jest.fn(),
    } as unknown as jest.Mocked<LogService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogsController],
      providers: [
        {
          provide: LogService,
          useValue: mockLogService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<LogsController>(LogsController);
  });

  describe('GET /logs - getLogs', () => {
    it('debería retornar logs sin filtros', async () => {
      // Arrange
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            level: LogLevel.ERROR,
            category: LogCategory.AUTH,
            message: 'Authentication failed',
            createdAt: new Date(),
          },
          {
            id: 'log-2',
            level: LogLevel.WARNING,
            category: LogCategory.SCANNER,
            message: 'File not found',
            createdAt: new Date(),
          },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      const result = await controller.getLogs();

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith({
        level: undefined,
        category: undefined,
        userId: undefined,
        entityId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 100,
        offset: 0,
      });
      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('debería filtrar logs por nivel', async () => {
      // Arrange
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            level: LogLevel.ERROR,
            category: LogCategory.DATABASE,
            message: 'Connection error',
            createdAt: new Date(),
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      const result = await controller.getLogs(LogLevel.ERROR);

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ level: LogLevel.ERROR })
      );
      expect(result.logs[0].level).toBe(LogLevel.ERROR);
    });

    it('debería filtrar logs por categoría', async () => {
      // Arrange
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            level: LogLevel.INFO,
            category: LogCategory.SCANNER,
            message: 'Scan completed',
            createdAt: new Date(),
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      const result = await controller.getLogs(undefined, LogCategory.SCANNER);

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ category: LogCategory.SCANNER })
      );
      expect(result.logs[0].category).toBe(LogCategory.SCANNER);
    });

    it('debería filtrar logs por userId', async () => {
      // Arrange
      const userId = 'user-123';
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      await controller.getLogs(undefined, undefined, userId);

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId })
      );
    });

    it('debería filtrar logs por entityId', async () => {
      // Arrange
      const entityId = 'track-456';
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      await controller.getLogs(undefined, undefined, undefined, entityId);

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ entityId })
      );
    });

    it('debería filtrar logs por rango de fechas', async () => {
      // Arrange
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-12-31T23:59:59.999Z';
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      await controller.getLogs(
        undefined,
        undefined,
        undefined,
        undefined,
        startDate,
        endDate
      );

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        })
      );
    });

    it('debería aplicar paginación con limit y offset', async () => {
      // Arrange
      const mockLogs = {
        logs: [],
        total: 100,
        limit: 20,
        offset: 40,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      const result = await controller.getLogs(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '20',
        '40'
      );

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 40,
        })
      );
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(40);
    });

    it('debería usar valores por defecto para limit y offset', async () => {
      // Arrange
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      await controller.getLogs();

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          offset: 0,
        })
      );
    });

    it('debería combinar múltiples filtros', async () => {
      // Arrange
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 50,
        offset: 10,
      };

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      // Act
      await controller.getLogs(
        LogLevel.ERROR,
        LogCategory.AUTH,
        'user-123',
        'entity-456',
        '2024-01-01',
        '2024-12-31',
        '50',
        '10'
      );

      // Assert
      expect(mockLogService.getLogs).toHaveBeenCalledWith({
        level: LogLevel.ERROR,
        category: LogCategory.AUTH,
        userId: 'user-123',
        entityId: 'entity-456',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 50,
        offset: 10,
      });
    });
  });

  describe('GET /logs/stats - getStats', () => {
    it('debería retornar estadísticas sin filtros', async () => {
      // Arrange
      const mockStats = {
        totalLogs: 1000,
        byLevel: {
          [LogLevel.CRITICAL]: 5,
          [LogLevel.ERROR]: 50,
          [LogLevel.WARNING]: 200,
        },
        byCategory: {
          [LogCategory.AUTH]: 100,
          [LogCategory.SCANNER]: 300,
          [LogCategory.DATABASE]: 50,
        },
      };

      mockLogService.getLogStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(mockLogService.getLogStats).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
      });
      expect(result.totalLogs).toBe(1000);
      expect(result.byLevel).toBeDefined();
      expect(result.byCategory).toBeDefined();
    });

    it('debería filtrar estadísticas por rango de fechas', async () => {
      // Arrange
      const startDate = '2024-06-01';
      const endDate = '2024-06-30';
      const mockStats = {
        totalLogs: 500,
        byLevel: {},
        byCategory: {},
      };

      mockLogService.getLogStats.mockResolvedValue(mockStats);

      // Act
      await controller.getStats(startDate, endDate);

      // Assert
      expect(mockLogService.getLogStats).toHaveBeenCalledWith({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    });

    it('debería manejar solo startDate', async () => {
      // Arrange
      const startDate = '2024-01-01';
      const mockStats = {
        totalLogs: 750,
        byLevel: {},
        byCategory: {},
      };

      mockLogService.getLogStats.mockResolvedValue(mockStats);

      // Act
      await controller.getStats(startDate);

      // Assert
      expect(mockLogService.getLogStats).toHaveBeenCalledWith({
        startDate: new Date(startDate),
        endDate: undefined,
      });
    });
  });

  describe('GET /logs/categories - getCategories', () => {
    it('debería retornar todas las categorías disponibles', () => {
      // Act
      const result = controller.getCategories();

      // Assert
      expect(result.categories).toBeDefined();
      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.categories).toContain(LogCategory.AUTH);
      expect(result.categories).toContain(LogCategory.SCANNER);
      expect(result.categories).toContain(LogCategory.DATABASE);
      expect(result.categories).toContain(LogCategory.CACHE);
    });

    it('debería incluir todas las categorías del enum', () => {
      // Act
      const result = controller.getCategories();

      // Assert
      const enumValues = Object.values(LogCategory);
      expect(result.categories).toHaveLength(enumValues.length);
      enumValues.forEach((category) => {
        expect(result.categories).toContain(category);
      });
    });
  });

  describe('GET /logs/levels - getLevels', () => {
    it('debería retornar todos los niveles de severidad', () => {
      // Act
      const result = controller.getLevels();

      // Assert
      expect(result.levels).toBeDefined();
      expect(Array.isArray(result.levels)).toBe(true);
      expect(result.levels).toContain(LogLevel.CRITICAL);
      expect(result.levels).toContain(LogLevel.ERROR);
      expect(result.levels).toContain(LogLevel.WARNING);
      expect(result.levels).toContain(LogLevel.INFO);
      expect(result.levels).toContain(LogLevel.DEBUG);
    });

    it('debería incluir todos los niveles del enum', () => {
      // Act
      const result = controller.getLevels();

      // Assert
      const enumValues = Object.values(LogLevel);
      expect(result.levels).toHaveLength(enumValues.length);
      enumValues.forEach((level) => {
        expect(result.levels).toContain(level);
      });
    });
  });
});
