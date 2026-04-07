import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { WsJwtGuard } from './ws-jwt.guard';
import { Socket } from 'socket.io';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { IUserRepository } from '@features/auth/domain/ports';
import { TokenBlacklistService } from '@features/auth/infrastructure/services/token-blacklist.service';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { createMockUserProps } from '@shared/testing/mock.types';

const createMockLogger = (): jest.Mocked<PinoLogger> =>
  ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  }) as unknown as jest.Mocked<PinoLogger>;

const createMockSecretsService = (): jest.Mocked<SecuritySecretsService> =>
  ({
    jwtSecret: 'test-jwt-secret',
    jwtRefreshSecret: 'test-jwt-refresh-secret',
    initializeSecrets: jest.fn(),
  }) as unknown as jest.Mocked<SecuritySecretsService>;

interface MockSocket {
  id: string;
  handshake: {
    query: Record<string, string | string[]>;
    auth: Record<string, string>;
    headers: Record<string, string>;
  };
  data: Record<string, unknown>;
}

const createMockUser = (overrides: Partial<UserProps> = {}): User => {
  return User.reconstruct(createMockUserProps(overrides));
};

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let mockJwtService: { verifyAsync: jest.Mock };
  let mockUserRepository: jest.Mocked<Pick<IUserRepository, 'findById'>>;
  let mockTokenBlacklist: jest.Mocked<Pick<TokenBlacklistService, 'isBlacklisted'>>;
  let mockSocket: MockSocket;
  let mockContext: ExecutionContext;
  let mockLogger: jest.Mocked<PinoLogger>;
  let mockSecretsService: jest.Mocked<SecuritySecretsService>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockSecretsService = createMockSecretsService();
    mockJwtService = {
      verifyAsync: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<Pick<IUserRepository, 'findById'>>;

    mockTokenBlacklist = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<Pick<TokenBlacklistService, 'isBlacklisted'>>;

    // Default: usuario activo encontrado
    const defaultUser = createMockUser({ id: 'user-123', username: 'testuser' });
    (mockUserRepository.findById as jest.Mock).mockResolvedValue(defaultUser);

    guard = new WsJwtGuard(
      mockLogger,
      mockJwtService as unknown as JwtService,
      mockSecretsService,
      mockUserRepository as unknown as IUserRepository,
      mockTokenBlacklist as unknown as TokenBlacklistService
    );

    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        query: {},
        auth: {},
        headers: {},
      },
      data: {},
    };

    mockContext = {
      switchToWs: () => ({
        getClient: () => mockSocket as unknown as Socket,
      }),
    } as ExecutionContext;
  });

  describe('canActivate', () => {
    it('should allow connection with valid token from query param', async () => {
      const token = 'valid-token';
      const payload = { userId: 'user-123', username: 'testuser', jti: 'jti-1' };

      mockSocket.handshake.query = { token };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.user).toEqual(
        expect.objectContaining({ userId: 'user-123', isAdmin: false })
      );
      expect(mockSocket.data.userId).toBe('user-123');
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: mockSecretsService.jwtSecret,
      });
    });

    it('should allow connection with valid token from auth object', async () => {
      const token = 'valid-token';
      const payload = { userId: 'user-123', username: 'testuser2', jti: 'jti-2' };

      mockSocket.handshake.auth = { token };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.userId).toBe('user-123');
    });

    it('should allow connection with valid token from Authorization header', async () => {
      const token = 'valid-token';
      const payload = { userId: 'user-123', username: 'testuser3', jti: 'jti-3' };

      mockSocket.handshake.headers = { authorization: `Bearer ${token}` };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.userId).toBe('user-123');
    });

    it('should reject connection without token', async () => {
      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('No token provided');
    });

    it('should reject connection with invalid token', async () => {
      mockSocket.handshake.query = { token: 'invalid-token' };
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Unauthorized');
    });

    it('should reject connection with expired token', async () => {
      mockSocket.handshake.query = { token: 'expired-token' };
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
    });

    it('should reject connection with blacklisted token', async () => {
      mockSocket.handshake.query = { token: 'revoked-token' };
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 'user-123',
        username: 'testuser',
        jti: 'revoked-jti',
      });
      (mockTokenBlacklist.isBlacklisted as jest.Mock).mockResolvedValue(true);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Token revoked');
    });

    it('should reject inactive user', async () => {
      mockSocket.handshake.query = { token: 'valid-token' };
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 'user-123',
        username: 'testuser',
        jti: 'jti-inactive',
      });
      const inactiveUser = createMockUser({ id: 'user-123', isActive: false });
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(inactiveUser);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Unauthorized');
    });

    it('should reject when user not found in database', async () => {
      mockSocket.handshake.query = { token: 'valid-token' };
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 'user-999',
        username: 'testuser',
        jti: 'jti-notfound',
      });
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
    });

    it('should include isAdmin from database user', async () => {
      const token = 'valid-token';
      const payload = { userId: 'admin-123', username: 'admin', jti: 'jti-admin' };

      mockSocket.handshake.query = { token };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      const adminUser = createMockUser({ id: 'admin-123', isAdmin: true });
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(adminUser);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.user).toEqual(expect.objectContaining({ isAdmin: true }));
    });

    it('should handle array of tokens in query param', async () => {
      const token = 'valid-token';
      const payload = { userId: 'user-123', username: 'testuser4', jti: 'jti-arr' };

      mockSocket.handshake.query = { token: [token, 'other-token'] };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, expect.any(Object));
    });

    it('should skip re-verification if user already cached in socket.data', async () => {
      mockSocket.data.user = { isAdmin: false, isActive: true };

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });
});
