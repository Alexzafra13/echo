import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService, HealthCheckResult } from './health-check.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    mockHealthCheckService = {
      check: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health - check', () => {
    it('debería retornar status ok cuando todos los servicios están saludables', async () => {
      // Arrange
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        timestamp: Date.now(),
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'ok',
          cache: 'ok',
        },
        system: {
          memory: {
            total: 16384,
            free: 8192,
            used: 8192,
            usagePercent: 50,
          },
          cpu: {
            loadAverage: [1.5, 1.2, 1.0],
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('ok');
      expect(result.services.cache).toBe('ok');
      expect(result.uptime).toBe(3600);
      expect(result.system).toBeDefined();
    });

    it('debería propagar HttpException 503 cuando la base de datos falla', async () => {
      // Arrange
      const unhealthyResult: HealthCheckResult = {
        status: 'error',
        timestamp: Date.now(),
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'error',
          cache: 'ok',
        },
        error: 'Database: Connection timeout',
      };

      mockHealthCheckService.check.mockRejectedValue(
        new HttpException(unhealthyResult, HttpStatus.SERVICE_UNAVAILABLE)
      );

      // Act & Assert
      await expect(controller.check()).rejects.toThrow(HttpException);

      try {
        await controller.check();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const response = (error as HttpException).getResponse() as HealthCheckResult;
        expect(response.status).toBe('error');
        expect(response.services.database).toBe('error');
      }
    });

    it('debería propagar HttpException 503 cuando Redis falla', async () => {
      // Arrange
      const unhealthyResult: HealthCheckResult = {
        status: 'error',
        timestamp: Date.now(),
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'ok',
          cache: 'error',
        },
        error: 'Cache: Connection refused',
      };

      mockHealthCheckService.check.mockRejectedValue(
        new HttpException(unhealthyResult, HttpStatus.SERVICE_UNAVAILABLE)
      );

      // Act & Assert
      await expect(controller.check()).rejects.toThrow(HttpException);
    });

    it('debería propagar HttpException 503 cuando ambos servicios fallan', async () => {
      // Arrange
      const unhealthyResult: HealthCheckResult = {
        status: 'error',
        timestamp: Date.now(),
        uptime: 3600,
        version: '1.0.0',
        services: {
          database: 'error',
          cache: 'error',
        },
        error: 'Database: Connection failed; Cache: Connection refused',
      };

      mockHealthCheckService.check.mockRejectedValue(
        new HttpException(unhealthyResult, HttpStatus.SERVICE_UNAVAILABLE)
      );

      // Act & Assert
      try {
        await controller.check();
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as HealthCheckResult;
        expect(response.services.database).toBe('error');
        expect(response.services.cache).toBe('error');
      }
    });

    it('debería incluir métricas del sistema en respuesta saludable', async () => {
      // Arrange
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        timestamp: Date.now(),
        uptime: 7200,
        version: '2.0.0',
        services: {
          database: 'ok',
          cache: 'ok',
        },
        system: {
          memory: {
            total: 32768,
            free: 16384,
            used: 16384,
            usagePercent: 50,
          },
          cpu: {
            loadAverage: [2.0, 1.5, 1.0],
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.system).toBeDefined();
      expect(result.system?.memory.total).toBe(32768);
      expect(result.system?.memory.usagePercent).toBe(50);
      expect(result.system?.cpu.loadAverage).toHaveLength(3);
    });

    it('debería retornar versión correcta del sistema', async () => {
      // Arrange
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        timestamp: Date.now(),
        uptime: 1000,
        version: '3.5.2',
        services: {
          database: 'ok',
          cache: 'ok',
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.version).toBe('3.5.2');
    });

    it('debería retornar timestamp válido', async () => {
      // Arrange
      const now = Date.now();
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        timestamp: now,
        uptime: 100,
        version: '1.0.0',
        services: {
          database: 'ok',
          cache: 'ok',
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result.timestamp).toBe(now);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });
});
