import { Test, TestingModule } from '@nestjs/testing';
import { LogCleanupService } from './log-cleanup.service';
import { LogService, LogCategory } from './log.service';

describe('LogCleanupService', () => {
  let service: LogCleanupService;
  let mockLogger: any;
  let mockLogService: jest.Mocked<LogService>;

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
      ],
    }).compile();

    service = module.get<LogCleanupService>(LogCleanupService);
  });

  describe('handleCleanup', () => {
    it('debería ejecutar limpieza y loguear resultado cuando hay logs eliminados', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(150);

      // Act
      await service.handleCleanup();

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(30); // Default retention
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ retentionDays: 30 }),
        'Starting scheduled log cleanup',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ deletedCount: 150, retentionDays: 30 }),
        'Log cleanup completed',
      );
    });

    it('debería usar debug cuando no hay logs para eliminar', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(0);

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
        'Failed to clean up old logs',
      );
      expect(mockLogService.error).toHaveBeenCalledWith(
        LogCategory.CLEANUP,
        'Scheduled log cleanup failed',
        {},
        error,
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
    it('debería permitir limpieza manual con retención por defecto', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(50);

      // Act
      const result = await service.triggerCleanup();

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(30);
      expect(result).toBe(50);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { retentionDays: 30 },
        'Manual log cleanup triggered',
      );
    });

    it('debería permitir especificar días de retención personalizados', async () => {
      // Arrange
      mockLogService.cleanupOldLogs.mockResolvedValue(200);

      // Act
      const result = await service.triggerCleanup(7);

      // Assert
      expect(mockLogService.cleanupOldLogs).toHaveBeenCalledWith(7);
      expect(result).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { retentionDays: 7 },
        'Manual log cleanup triggered',
      );
    });
  });
});
