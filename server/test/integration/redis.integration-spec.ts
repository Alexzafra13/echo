import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getLoggerToken } from 'nestjs-pino';
import { RedisService } from '../../src/infrastructure/cache/redis.service';

// Mock logger para tests de integración
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

/**
 * Redis Integration Tests
 *
 * Estos tests verifican la integración real con Redis (no mocks).
 * Requieren que Redis esté corriendo (docker-compose.dev.yml).
 *
 * Ejecutar: pnpm test:integration redis.integration-spec
 */
describe('Redis Integration', () => {
  let redisService: RedisService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        RedisService,
        {
          provide: getLoggerToken(RedisService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
    await redisService.onModuleInit();

    // Limpiar Redis antes de empezar
    await redisService.clear();
  });

  afterAll(async () => {
    // Limpiar Redis después de los tests
    await redisService.clear();
    await redisService.onModuleDestroy();
    await module.close();
  });

  afterEach(async () => {
    // Limpiar después de cada test
    await redisService.clear();
  });

  describe('Basic Operations', () => {
    it('should connect to Redis successfully', async () => {
      // Si llegamos aquí, la conexión fue exitosa
      expect(redisService).toBeDefined();
    });

    it('should set and get a string value', async () => {
      // Arrange
      const key = 'test:string';
      const value = 'hello world';

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should set and get an object value', async () => {
      // Arrange
      const key = 'test:object';
      const value = {
        id: '123',
        name: 'Test Object',
        nested: {
          property: 'value',
        },
      };

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should set and get an array value', async () => {
      // Arrange
      const key = 'test:array';
      const value = [1, 2, 3, 4, 5];

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      // Act
      const result = await redisService.get('non:existent:key');

      // Assert
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      // Arrange
      const key = 'test:delete';
      await redisService.set(key, 'value to delete');

      // Act
      await redisService.del(key);
      const result = await redisService.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle complex objects with dates', async () => {
      // Arrange
      const key = 'test:date';
      const value = {
        id: '1',
        name: 'Test',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result.id).toBe(value.id);
      expect(result.name).toBe(value.name);
      // Dates are serialized as ISO strings
      expect(new Date(result.createdAt)).toEqual(value.createdAt);
      expect(new Date(result.updatedAt)).toEqual(value.updatedAt);
    });
  });

  describe('TTL Operations', () => {
    it('should expire key after TTL', async () => {
      // Arrange
      const key = 'test:ttl';
      const value = 'expires soon';
      const ttl = 1; // 1 segundo

      // Act
      await redisService.set(key, value, ttl);
      const beforeExpire = await redisService.get(key);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const afterExpire = await redisService.get(key);

      // Assert
      expect(beforeExpire).toBe(value);
      expect(afterExpire).toBeNull();
    }, 10000); // Timeout aumentado para este test

    it('should persist key without TTL', async () => {
      // Arrange
      const key = 'test:persist';
      const value = 'never expires';

      // Act
      await redisService.set(key, value); // Sin TTL

      // Wait 1 segundo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await redisService.get(key);

      // Assert
      expect(result).toBe(value);
    }, 5000);
  });

  describe('Multiple Keys', () => {
    it('should handle multiple keys independently', async () => {
      // Arrange
      const keys = ['test:multi:1', 'test:multi:2', 'test:multi:3'];
      const values = ['value1', 'value2', 'value3'];

      // Act
      for (let i = 0; i < keys.length; i++) {
        await redisService.set(keys[i], values[i]);
      }

      const results = await Promise.all(keys.map((key) => redisService.get(key)));

      // Assert
      expect(results).toEqual(values);
    });

    it('should delete only specified key', async () => {
      // Arrange
      await redisService.set('test:keep', 'keep this');
      await redisService.set('test:delete', 'delete this');

      // Act
      await redisService.del('test:delete');

      const kept = await redisService.get('test:keep');
      const deleted = await redisService.get('test:delete');

      // Assert
      expect(kept).toBe('keep this');
      expect(deleted).toBeNull();
    });
  });

  describe('Clear Operation', () => {
    it('should clear all keys', async () => {
      // Arrange
      await redisService.set('test:clear:1', 'value1');
      await redisService.set('test:clear:2', 'value2');
      await redisService.set('test:clear:3', 'value3');

      // Act
      await redisService.clear();

      const result1 = await redisService.get('test:clear:1');
      const result2 = await redisService.get('test:clear:2');
      const result3 = await redisService.get('test:clear:3');

      // Assert
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle special characters in keys', async () => {
      // Arrange
      const key = 'test:special:chars:@#$%^&*()';
      const value = 'special value';

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should handle empty string values', async () => {
      // Arrange
      const key = 'test:empty';
      const value = '';

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should handle null values in objects', async () => {
      // Arrange
      const key = 'test:null';
      const value = { id: '1', nullField: null };

      // Act
      await redisService.set(key, value);
      const result = await redisService.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(result.nullField).toBeNull();
    });
  });
});
