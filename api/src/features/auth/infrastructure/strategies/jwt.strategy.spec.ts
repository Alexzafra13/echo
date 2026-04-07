import { JwtStrategy } from './jwt.strategy';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { IUserRepository } from '../../domain/ports';
import { User } from '../../domain/entities/user.entity';
import { createMockUserProps } from '@shared/testing/mock.types';
import { FastifyRequest } from 'fastify';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockTokenBlacklist: jest.Mocked<Pick<TokenBlacklistService, 'isBlacklisted'>>;
  let mockSecretsService: { jwtSecret: string; jwtRefreshSecret: string };

  const createMockRequest = (token?: string): FastifyRequest =>
    ({
      headers: {
        authorization: token ? `Bearer ${token}` : undefined,
      },
    }) as unknown as FastifyRequest;

  const validPayload = {
    userId: 'user-123',
    username: 'testuser',
    jti: 'jti-abc-123',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updatePartial: jest.fn(),
      updatePassword: jest.fn(),
      updateAdminStatus: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    mockTokenBlacklist = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
    };

    mockSecretsService = {
      jwtSecret: 'test-jwt-secret-key-for-testing',
      jwtRefreshSecret: 'test-refresh-secret-key',
    };

    strategy = new JwtStrategy(
      mockUserRepo,
      mockTokenBlacklist as unknown as TokenBlacklistService,
      mockSecretsService as unknown as SecuritySecretsService
    );
  });

  describe('validate', () => {
    it('should return user data without passwordHash when token is valid', async () => {
      const user = User.reconstruct(
        createMockUserProps({
          id: 'user-123',
          username: 'testuser',
          name: 'Test User',
          isAdmin: false,
          isActive: true,
        })
      );
      mockUserRepo.findById.mockResolvedValue(user);

      const result = await strategy.validate(createMockRequest('valid-token'), validPayload);

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result!.id).toBe('user-123');
      expect(result!.username).toBe('testuser');
    });

    it('should include rawToken, tokenJti, and tokenExp in response', async () => {
      const user = User.reconstruct(createMockUserProps({ id: 'user-123' }));
      mockUserRepo.findById.mockResolvedValue(user);

      const result = await strategy.validate(createMockRequest('my-raw-token'), validPayload);

      expect(result).not.toBeNull();
      expect(result!.rawToken).toBe('my-raw-token');
      expect(result!.tokenJti).toBe('jti-abc-123');
      expect(result!.tokenExp).toBe(validPayload.exp);
    });

    it('should return null when token is blacklisted', async () => {
      mockTokenBlacklist.isBlacklisted.mockResolvedValue(true);

      const result = await strategy.validate(createMockRequest('blacklisted-token'), validPayload);

      expect(result).toBeNull();
      expect(mockUserRepo.findById).not.toHaveBeenCalled();
    });

    it('should return null when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await strategy.validate(createMockRequest('valid-token'), validPayload);

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const inactiveUser = User.reconstruct(
        createMockUserProps({ id: 'user-123', isActive: false })
      );
      mockUserRepo.findById.mockResolvedValue(inactiveUser);

      const result = await strategy.validate(createMockRequest('valid-token'), validPayload);

      expect(result).toBeNull();
    });

    it('should check blacklist before querying the database', async () => {
      mockTokenBlacklist.isBlacklisted.mockResolvedValue(true);

      await strategy.validate(createMockRequest('token'), validPayload);

      expect(mockTokenBlacklist.isBlacklisted).toHaveBeenCalledWith('jti-abc-123');
      expect(mockUserRepo.findById).not.toHaveBeenCalled();
    });

    it('should look up user by userId from token payload', async () => {
      const user = User.reconstruct(createMockUserProps({ id: 'user-123' }));
      mockUserRepo.findById.mockResolvedValue(user);

      await strategy.validate(createMockRequest('token'), validPayload);

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-123');
    });

    it('should handle admin users correctly', async () => {
      const adminUser = User.reconstruct(
        createMockUserProps({ id: 'user-123', isAdmin: true, isActive: true })
      );
      mockUserRepo.findById.mockResolvedValue(adminUser);

      const result = await strategy.validate(createMockRequest('token'), validPayload);

      expect(result).not.toBeNull();
      expect(result!.isAdmin).toBe(true);
    });

    it('should extract rawToken correctly from Bearer header', async () => {
      const user = User.reconstruct(createMockUserProps({ id: 'user-123' }));
      mockUserRepo.findById.mockResolvedValue(user);

      const result = await strategy.validate(
        createMockRequest('eyJhbGciOiJIUzI1NiJ9.payload.signature'),
        validPayload
      );

      expect(result!.rawToken).toBe('eyJhbGciOiJIUzI1NiJ9.payload.signature');
    });
  });
});
