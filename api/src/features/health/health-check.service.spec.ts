import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn(() => 17179869184), // 16 GB
  freemem: jest.fn(() => 8589934592), // 8 GB
  loadavg: jest.fn(() => [1.5, 1.2, 1.0]),
}));

// Mock fs/promises for storage check
jest.mock('fs/promises', () => ({
  statfs: jest.fn().mockResolvedValue({
    bsize: 4096,
    blocks: 125000000, // ~500GB
    bfree: 25000000, // ~100GB free (80% used)
  }),
}));

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let mockDrizzleService: jest.Mocked<DrizzleService>;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockSettingsService: jest.Mocked<SettingsService>;

  beforeEach(async () => {
    mockDrizzleService = {
      db: {
        execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      },
    } as unknown as jest.Mocked<DrizzleService>;

    mockRedisService = {
      ping: jest.fn().mockResolvedValue(true),
      connected: true,
    } as unknown as jest.Mocked<RedisService>;

    mockSettingsService = {
      get: jest.fn().mockResolvedValue('/music'),
    } as unknown as jest.Mocked<SettingsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
  });

  describe('check', () => {
    it('debería retornar status ok cuando DB, Redis y Storage están saludables', async () => {
      const result = await service.check();

      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('ok');
      expect(result.services.cache).toBe('ok');
      expect(result.services.storage).toBe('ok');
      expect(result.error).toBeUndefined();
    });

    it('debería incluir timestamp válido', async () => {
      const before = Date.now();
      const result = await service.check();
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('debería incluir uptime en segundos', async () => {
      const result = await service.check();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('debería incluir versión del sistema', async () => {
      const result = await service.check();

      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    });

    it('debería incluir métricas del sistema', async () => {
      const result = await service.check();

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
      mockDrizzleService.db.execute = jest.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(service.check()).rejects.toThrow(HttpException);

      try {
        await service.check();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.status).toBe('error');
        expect((response.services as Record<string, string>).database).toBe('error');
        expect(response.error).toContain('Database');
      }
    });

    it('debería retornar status degraded cuando solo Redis falla', async () => {
      mockRedisService.ping = jest.fn().mockResolvedValue(false);

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('ok');
      expect(result.services.cache).toBe('error');
      expect(result.error).toContain('Cache');
    });

    it('debería manejar errores de BD que no son instancias de Error', async () => {
      mockDrizzleService.db.execute = jest.fn().mockRejectedValue('String error');

      await expect(service.check()).rejects.toThrow(HttpException);

      try {
        await service.check();
      } catch (error) {
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.error).toContain('Database');
      }
    });

    it('debería ejecutar chequeos en paralelo', async () => {
      const dbExecuteStart = Date.now();
      mockDrizzleService.db.execute = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [{ '?column?': 1 }];
      });

      await service.check();
      const duration = Date.now() - dbExecuteStart;

      expect(duration).toBeLessThan(150);
    });

    it('debería incluir información de storage cuando library está configurada', async () => {
      const result = await service.check();

      expect(result.system?.storage).toBeDefined();
      expect(result.system?.storage?.path).toBe('/music');
      expect(result.system?.storage?.totalMB).toBeGreaterThan(0);
      expect(result.system?.storage?.freeMB).toBeGreaterThan(0);
      expect(result.system?.storage?.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.system?.storage?.usagePercent).toBeLessThanOrEqual(100);
    });

    it('debería manejar library path no configurado', async () => {
      mockSettingsService.get = jest.fn().mockResolvedValue(null);

      const result = await service.check();

      // Storage service should still be ok if path not configured (first run)
      expect(result.services.storage).toBe('ok');
      expect(result.system?.storage).toBeUndefined();
    });
  });
});
