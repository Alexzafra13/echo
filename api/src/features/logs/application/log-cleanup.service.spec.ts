import { Test, TestingModule } from '@nestjs/testing';
import { LogCleanupService } from './log-cleanup.service';
import { LogService, LogCategory } from './log.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';

describe('LogCleanupService', () => {
  let service: LogCleanupService;
  let mockLogger: { info: jest.Mock; debug: jest.Mock; error: jest.Mock };
  let mockLogService: jest.Mocked<LogService>;
  let mockDrizzleService: { db: any };
  let mockDeleteReturning: jest.Mock;
  let mockSettingsService: { getNumber: jest.Mock };

  beforeEach(async () => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    mockLogService = {
      cleanupOldLogs: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LogService>;

    mockDeleteReturning = jest.fn().mockResolvedValue([]);
    mockDrizzleService = {
      db: {
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: mockDeleteReturning,
          }),
        }),
      },
    };

    mockSettingsService = {
      getNumber: jest.fn().mockResolvedValue(30),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogCleanupService,
        {
          provide: `PinoLogger:${LogCleanupService.name}`,
          useValue: mockLogger,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<LogCleanupService>(LogCleanupService);
  });

  describe('getRetentionDays', () => {
    it('debería retornar el valor configurado en settings', async () => {
      mockSettingsService.getNumber.mockResolvedValue(60);
      const result = await service.getRetentionDays();
      expect(result).toBe(60);
      expect(mockSettingsService.getNumber).toHaveBeenCalledWith('logs.retention_days', 30);
    });

    it('debería retornar mínimo 1 día aunque settings devuelva 0', async () => {
      mockSettingsService.getNumber.mockResolvedValue(0);
      const result = await service.getRetentionDays();
      expect(result).toBe(1);
    });
  });

  describe('handleCleanup', () => {
    it('debería ejecutar limpieza y loguear resultado cuando hay logs eliminados', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(150);
      mockDeleteReturning.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      // Act
      await service.handleCleanup();

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(30); // Default retention
      expect(mockDrizzleService.db.delete).toHaveBeenCalled(); // Enrichment cleanup
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ retentionDays: 30 }),
        'Starting scheduled log cleanup'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ deletedCount: 150, enrichmentDeleted: 2, retentionDays: 30 }),
        'Log cleanup completed'
      );
    });

    it('debería usar retención personalizada desde settings', async () => {
      // Arrange
      mockSettingsService.getNumber.mockResolvedValue(14);
      mockLogService.cleanupOldLogs.mockResolvedValue(50);
      mockDeleteReturning.mockResolvedValue([]);

      // Act
      await service.handleCleanup();

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(14);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ retentionDays: 14 }),
        'Starting scheduled log cleanup'
      );
    });

    it('debería usar debug cuando no hay logs para eliminar', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(0);
      mockDeleteReturning.mockResolvedValue([]);

      // Act
      await service.handleCleanup();

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('No old logs to clean up');
    });

    it('debería manejar errores y registrarlos en el sistema', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockLogService.cleanupOldLogs.mockRejectedValue(error);
      mockLogService.error.mockResolvedValue(undefined);

      // Act
      await service.handleCleanup();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Database connection failed' }),
        'Failed to clean up old logs'
      );
      expect(mockLogService.error).toHaveBeenCalledWith(
        LogCategory.CLEANUP,
        'Scheduled log cleanup failed',
        {},
        error
      );
    });

    it('debería continuar si falla el registro del error', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockRejectedValue(new Error('DB error'));
      mockLogService.error.mockRejectedValue(new Error('Log error too'));

      // Act & Assert - should not throw
      await expect(service.handleCleanup()).resolves.not.toThrow();
    });
  });

  describe('triggerCleanup', () => {
    it('debería permitir limpieza manual con retención desde settings', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(50);
      mockDeleteReturning.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

      // Act
      const result = await service.triggerCleanup();

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(30);
      expect(mockDrizzleService.db.delete).toHaveBeenCalled();
      expect(result).toBe(53); // 50 system + 3 enrichment
      expect(mockLogger.info).toHaveBeenCalledWith(
        { retentionDays: 30 },
        'Manual log cleanup triggered'
      );
    });

    it('debería permitir especificar días de retención personalizados', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(200);
      mockDeleteReturning.mockResolvedValue([{ id: 1 }]);

      // Act
      const result = await service.triggerCleanup(7);

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(7);
      expect(result).toBe(201); // 200 system + 1 enrichment
      expect(mockLogger.info).toHaveBeenCalledWith(
        { retentionDays: 7 },
        'Manual log cleanup triggered'
      );
    });
  });
});
