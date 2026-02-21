import { Test, TestingModule } from '@nestjs/testing';
import { LogService, LogLevel, LogCategory } from './log.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { PinoLogger, getLoggerToken } from 'nestjs-pino';

describe('LogService', () => {
  let service: LogService;
  let mockDrizzleService: jest.Mocked<DrizzleService>;
  let mockLogger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    mockDrizzleService = {
      db: {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockResolvedValue(undefined),
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
              groupBy: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      },
    } as unknown as jest.Mocked<DrizzleService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: getLoggerToken(LogService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<LogService>(LogService);
  });

  describe('critical', () => {
    it('debería loggear mensaje crítico a consola y BD', async () => {
      // Arrange
      const message = 'Critical system failure';
      const metadata = { userId: 'user-123' };

      // Act
      await service.critical(LogCategory.DATABASE, message, metadata);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });

    it('debería incluir stack trace cuando se proporciona error', async () => {
      // Arrange
      const error = new Error('Database connection lost');
      const message = 'Critical error occurred';

      // Act
      await service.critical(LogCategory.DATABASE, message, undefined, error);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection lost',
            stack: expect.any(String),
          }),
        }),
        message
      );
    });
  });

  describe('error', () => {
    it('debería loggear mensaje de error a consola y BD', async () => {
      // Arrange
      const message = 'Authentication failed';
      const metadata = { userId: 'user-456', ipAddress: '192.168.1.1' };

      // Act
      await service.error(LogCategory.AUTH, message, metadata);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          category: LogCategory.AUTH,
          userId: 'user-456',
          ipAddress: '192.168.1.1',
        }),
        message
      );
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });

    it('debería manejar error con metadatos completos', async () => {
      // Arrange
      const message = 'API request failed';
      const metadata = {
        userId: 'user-789',
        entityId: 'track-123',
        entityType: 'track',
        requestId: 'req-abc',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      // Act
      await service.error(LogCategory.API, message, metadata);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('warning', () => {
    it('debería loggear advertencia a consola y BD', async () => {
      // Arrange
      const message = 'High memory usage detected';

      // Act
      await service.warning(LogCategory.STORAGE, message);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ category: LogCategory.STORAGE }),
        message
      );
      expect(mockDrizzleService.db.insert).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('debería loggear info solo a consola (no a BD)', async () => {
      // Arrange
      const message = 'Scan started';

      // Act
      await service.info(LogCategory.SCANNER, message);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ category: LogCategory.SCANNER }),
        message
      );
      // INFO no debería persistirse en BD
      expect(mockDrizzleService.db.insert).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('debería loggear debug solo a consola (no a BD)', async () => {
      // Arrange
      const message = 'Processing file';
      const metadata = { entityId: 'file-123' };

      // Act
      await service.debug(LogCategory.SCANNER, message, metadata);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          category: LogCategory.SCANNER,
          entityId: 'file-123',
        }),
        message
      );
      // DEBUG no debería persistirse en BD
      expect(mockDrizzleService.db.insert).not.toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('debería retornar logs con valores por defecto', async () => {
      // Arrange
      const mockLogs = [{ id: 'log-1', level: LogLevel.ERROR, message: 'Error 1' }];
      const mockCount = [{ count: 1 }];

      // Create chainable mock
      const offsetMock = jest.fn().mockResolvedValue(mockLogs);
      const limitMock = jest.fn().mockReturnValue({ offset: offsetMock });
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      const selectMock = jest.fn().mockReturnValue({ from: fromMock });

      // For count query
      const countWhereMock = jest.fn().mockResolvedValue(mockCount);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      const countSelectMock = jest.fn().mockReturnValue({ from: countFromMock });

      mockDrizzleService.db.select = jest
        .fn()
        .mockReturnValueOnce({ from: fromMock }) // First call for logs
        .mockReturnValueOnce({ from: countFromMock }); // Second call for count

      // Act
      const result = await service.getLogs({});

      // Assert
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
    });

    it('debería aplicar límite máximo de 500', async () => {
      // Arrange
      const mockLogs: Record<string, unknown>[] = [];
      const mockCount = [{ count: 0 }];

      const offsetMock = jest.fn().mockResolvedValue(mockLogs);
      const limitMock = jest.fn().mockReturnValue({ offset: offsetMock });
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });

      const countWhereMock = jest.fn().mockResolvedValue(mockCount);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });

      mockDrizzleService.db.select = jest
        .fn()
        .mockReturnValueOnce({ from: fromMock })
        .mockReturnValueOnce({ from: countFromMock });

      // Act
      await service.getLogs({ limit: 1000 }); // Request more than max

      // Assert
      expect(limitMock).toHaveBeenCalledWith(500); // Should be capped at 500
    });
  });

  describe('getLogStats', () => {
    it('debería retornar estadísticas agregadas', async () => {
      // Arrange
      const mockTotalResult = [{ count: 100 }];
      const mockByLevelResult = [
        { level: LogLevel.ERROR, count: 30 },
        { level: LogLevel.WARNING, count: 70 },
      ];
      const mockByCategoryResult = [
        { category: LogCategory.AUTH, count: 50 },
        { category: LogCategory.DATABASE, count: 50 },
      ];

      // Mock for total count
      const countWhereMock1 = jest.fn().mockResolvedValue(mockTotalResult);
      const countFromMock1 = jest.fn().mockReturnValue({ where: countWhereMock1 });

      // Mock for by level
      const groupByMock2 = jest.fn().mockResolvedValue(mockByLevelResult);
      const whereMock2 = jest.fn().mockReturnValue({ groupBy: groupByMock2 });
      const fromMock2 = jest.fn().mockReturnValue({ where: whereMock2 });

      // Mock for by category
      const groupByMock3 = jest.fn().mockResolvedValue(mockByCategoryResult);
      const whereMock3 = jest.fn().mockReturnValue({ groupBy: groupByMock3 });
      const fromMock3 = jest.fn().mockReturnValue({ where: whereMock3 });

      mockDrizzleService.db.select = jest
        .fn()
        .mockReturnValueOnce({ from: countFromMock1 })
        .mockReturnValueOnce({ from: fromMock2 })
        .mockReturnValueOnce({ from: fromMock3 });

      // Act
      const result = await service.getLogStats({});

      // Assert
      expect(result).toHaveProperty('totalLogs');
      expect(result).toHaveProperty('byLevel');
      expect(result).toHaveProperty('byCategory');
    });
  });

  describe('cleanupOldLogs', () => {
    it('debería eliminar logs antiguos', async () => {
      // Arrange
      const deletedLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      const returningMock = jest.fn().mockResolvedValue(deletedLogs);
      const whereMock = jest.fn().mockReturnValue({ returning: returningMock });
      const deleteMock = jest.fn().mockReturnValue({ where: whereMock });

      mockDrizzleService.db.delete = deleteMock;

      // Act
      const result = await service.cleanupOldLogs(30);

      // Assert
      expect(result).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2,
          daysToKeep: 30,
        }),
        'Cleaned up old logs'
      );
    });

    it('debería usar 30 días por defecto', async () => {
      // Arrange
      const returningMock = jest.fn().mockResolvedValue([]);
      const whereMock = jest.fn().mockReturnValue({ returning: returningMock });
      const deleteMock = jest.fn().mockReturnValue({ where: whereMock });

      mockDrizzleService.db.delete = deleteMock;

      // Act
      await service.cleanupOldLogs();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          daysToKeep: 30,
        }),
        'Cleaned up old logs'
      );
    });
  });

  describe('error handling', () => {
    it('no debería propagar errores de logging', async () => {
      // Arrange
      mockDrizzleService.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      // Act & Assert - should not throw
      await expect(service.error(LogCategory.DATABASE, 'Test error')).resolves.not.toThrow();
    });

    it('debería loggear error de persistencia a consola', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      mockDrizzleService.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockRejectedValue(dbError),
      });

      // Act
      await service.error(LogCategory.DATABASE, 'Test error');

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: dbError }),
        'Failed to persist log to database'
      );
    });
  });
});
