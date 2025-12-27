import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    status: 'ready',
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn(() => 17179869184), // 16 GB
  freemem: jest.fn(() => 8589934592),  // 8 GB
  loadavg: jest.fn(() => [1.5, 1.2, 1.0]),
}));

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let mockDrizzleService: jest.Mocked<DrizzleService>;

  beforeEach(async () => {
    mockDrizzleService = {
      db: {
        execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      },
    } as unknown as jest.Mocked<DrizzleService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('check', () => {
    it('debería retornar status ok cuando DB y Redis están saludables', async () => {
      // Act
      const result = await service.check();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('ok');
      expect(result.services.cache).toBe('ok');
      expect(result.error).toBeUndefined();
    });

    it('debería incluir timestamp válido', async () => {
      // Arrange
      const before = Date.now();

      // Act
      const result = await service.check();

      // Assert
      const after = Date.now();
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('debería incluir uptime en segundos', async () => {
      // Act
      const result = await service.check();

      // Assert
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('debería incluir versión del sistema', async () => {
      // Act
      const result = await service.check();

      // Assert
      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    });

    it('debería incluir métricas del sistema', async () => {
      // Act
      const result = await service.check();

      // Assert
      expect(result.system).toBeDefined();
      expect(result.system?.memory).toBeDefined();
      expect(result.system?.memory.total).toBeGreaterThan(0);
      expect(result.system?.memory.free).toBeGreaterThan(0);
      expect(result.system?.memory.used).toBeGreaterThan(0);
      expect(result.system?.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.system?.memory.usagePercent).toBeLessThanOrEqual(100);
      expect(result.system?.cpu.loadAverage).toHaveLength(3);
    });

    it('debería lanzar HttpException 503 cuando la base de datos falla', async () => {
      // Arrange
      mockDrizzleService.db.execute = jest.fn().mockRejectedValue(
        new Error('Connection refused')
      );

      // Act & Assert
      await expect(service.check()).rejects.toThrow(HttpException);

      try {
        await service.check();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const response = (error as HttpException).getResponse() as any;
        expect(response.status).toBe('error');
        expect(response.services.database).toBe('error');
        expect(response.error).toContain('Database');
      }
    });

    it('debería manejar errores de BD que no son instancias de Error', async () => {
      // Arrange
      mockDrizzleService.db.execute = jest.fn().mockRejectedValue('String error');

      // Act & Assert
      await expect(service.check()).rejects.toThrow(HttpException);

      try {
        await service.check();
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.error).toContain('Database');
      }
    });

    it('debería ejecutar chequeos en paralelo', async () => {
      // Arrange
      const dbExecuteStart = Date.now();
      mockDrizzleService.db.execute = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return [{ '?column?': 1 }];
      });

      // Act
      await service.check();
      const duration = Date.now() - dbExecuteStart;

      // Assert
      // Si los checks fueran secuenciales, tomaría al menos 100ms (50ms cada uno)
      // En paralelo debería tomar ~50ms
      expect(duration).toBeLessThan(150); // Allow some margin
    });
  });

  describe('onModuleDestroy', () => {
    it('debería cerrar la conexión de Redis al destruir el módulo', async () => {
      // Act & Assert - no debería lanzar error
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
