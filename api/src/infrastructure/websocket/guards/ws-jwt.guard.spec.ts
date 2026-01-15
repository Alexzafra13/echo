import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { WsJwtGuard } from './ws-jwt.guard';
import { Socket } from 'socket.io';
import { SecuritySecretsService } from '@config/security-secrets.service';

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

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let mockJwtService: { verifyAsync: jest.Mock };
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

    guard = new WsJwtGuard(
      mockLogger,
      mockJwtService as unknown as JwtService,
      mockSecretsService,
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
      const payload = { sub: 'user-123', username: 'testuser' };

      mockSocket.handshake.query = { token };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.user).toEqual(payload);
      expect(mockSocket.data.userId).toBe('user-123');
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: mockSecretsService.jwtSecret,
      });
    });

    it('should allow connection with valid token from auth object', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-456', username: 'testuser2' };

      mockSocket.handshake.auth = { token };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.userId).toBe('user-456');
    });

    it('should allow connection with valid token from Authorization header', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-789', username: 'testuser3' };

      mockSocket.handshake.headers = { authorization: `Bearer ${token}` };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data.userId).toBe('user-789');
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

    it('should handle array of tokens in query param', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-999', username: 'testuser4' };

      mockSocket.handshake.query = { token: [token, 'other-token'] };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token, expect.any(Object));
    });
  });
});
