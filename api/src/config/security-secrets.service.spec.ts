import { SecuritySecretsService } from './security-secrets.service';
import { createMockPinoLogger, MockPinoLogger } from '@shared/testing/mock.types';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { PinoLogger } from 'nestjs-pino';

describe('SecuritySecretsService', () => {
  let service: SecuritySecretsService;
  let mockDrizzle: { db: { select: jest.Mock; insert: jest.Mock } };
  let mockLogger: MockPinoLogger;

  const createSelectChain = (result: unknown[] = []) => {
    const chain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(result),
    };
    return chain;
  };

  const createInsertChain = () => {
    const chain = {
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    };
    return chain;
  };

  beforeEach(() => {
    // Clean env vars
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    mockLogger = createMockPinoLogger();

    mockDrizzle = {
      db: {
        select: jest.fn(),
        insert: jest.fn(),
      },
    };
  });

  describe('constructor with env vars', () => {
    it('should use secrets from environment variables when available', () => {
      process.env.JWT_SECRET = 'env-jwt-secret';
      process.env.JWT_REFRESH_SECRET = 'env-refresh-secret';

      service = new SecuritySecretsService(
        mockDrizzle as unknown as DrizzleService,
        mockLogger as unknown as PinoLogger
      );

      expect(service.jwtSecret).toBe('env-jwt-secret');
      expect(service.jwtRefreshSecret).toBe('env-refresh-secret');
    });

    it('should skip async initialization when env vars are set', async () => {
      process.env.JWT_SECRET = 'env-jwt-secret';
      process.env.JWT_REFRESH_SECRET = 'env-refresh-secret';

      service = new SecuritySecretsService(
        mockDrizzle as unknown as DrizzleService,
        mockLogger as unknown as PinoLogger
      );

      await service.onModuleInit();

      // Should not query DB since already initialized
      expect(mockDrizzle.db.select).not.toHaveBeenCalled();
    });
  });

  describe('initializeSecrets (async)', () => {
    beforeEach(() => {
      service = new SecuritySecretsService(
        mockDrizzle as unknown as DrizzleService,
        mockLogger as unknown as PinoLogger
      );
    });

    it('should throw if accessed before initialization', () => {
      expect(() => service.jwtSecret).toThrow('not initialized');
      expect(() => service.jwtRefreshSecret).toThrow('not initialized');
    });

    it('should load secrets from database when env vars are not set', async () => {
      const selectChain1 = createSelectChain([{ value: 'db-jwt-secret' }]);
      const selectChain2 = createSelectChain([{ value: 'db-refresh-secret' }]);

      mockDrizzle.db.select.mockReturnValueOnce(selectChain1).mockReturnValueOnce(selectChain2);

      await service.initializeSecrets();

      expect(service.jwtSecret).toBe('db-jwt-secret');
      expect(service.jwtRefreshSecret).toBe('db-refresh-secret');
    });

    it('should auto-generate and persist secrets when not in env or DB', async () => {
      const selectChain1 = createSelectChain([]);
      const selectChain2 = createSelectChain([]);
      const insertChain1 = createInsertChain();
      const insertChain2 = createInsertChain();

      mockDrizzle.db.select.mockReturnValueOnce(selectChain1).mockReturnValueOnce(selectChain2);
      mockDrizzle.db.insert.mockReturnValueOnce(insertChain1).mockReturnValueOnce(insertChain2);

      await service.initializeSecrets();

      // Should have generated secrets (base64, 64 bytes = 88 chars)
      expect(service.jwtSecret).toBeDefined();
      expect(service.jwtSecret.length).toBeGreaterThan(0);
      expect(service.jwtRefreshSecret).toBeDefined();
      expect(service.jwtRefreshSecret.length).toBeGreaterThan(0);

      // Should have saved to DB
      expect(mockDrizzle.db.insert).toHaveBeenCalledTimes(2);
      expect(insertChain1.values).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'jwt_secret',
          category: 'security',
          type: 'secret',
          isPublic: false,
        })
      );
    });

    it('should generate different secrets for access and refresh', async () => {
      const selectChain1 = createSelectChain([]);
      const selectChain2 = createSelectChain([]);

      mockDrizzle.db.select.mockReturnValueOnce(selectChain1).mockReturnValueOnce(selectChain2);
      mockDrizzle.db.insert
        .mockReturnValueOnce(createInsertChain())
        .mockReturnValueOnce(createInsertChain());

      await service.initializeSecrets();

      expect(service.jwtSecret).not.toBe(service.jwtRefreshSecret);
    });

    it('should not re-initialize if already initialized', async () => {
      const selectChain1 = createSelectChain([{ value: 'db-secret' }]);
      const selectChain2 = createSelectChain([{ value: 'db-refresh' }]);

      mockDrizzle.db.select.mockReturnValueOnce(selectChain1).mockReturnValueOnce(selectChain2);

      await service.initializeSecrets();
      await service.initializeSecrets(); // second call

      // Only 2 selects (one per secret), not 4
      expect(mockDrizzle.db.select).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleInit', () => {
    it('should call initializeSecrets when not already initialized', async () => {
      const selectChain1 = createSelectChain([{ value: 'secret1' }]);
      const selectChain2 = createSelectChain([{ value: 'secret2' }]);

      mockDrizzle.db.select.mockReturnValueOnce(selectChain1).mockReturnValueOnce(selectChain2);

      service = new SecuritySecretsService(
        mockDrizzle as unknown as DrizzleService,
        mockLogger as unknown as PinoLogger
      );

      await service.onModuleInit();

      expect(service.jwtSecret).toBe('secret1');
    });
  });
});
