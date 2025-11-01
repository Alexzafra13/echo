import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from './ws-jwt.guard';
import { Socket } from 'socket.io';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: JwtService;
  let mockSocket: Partial<Socket>;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    guard = new WsJwtGuard(jwtService);

    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        query: {},
        auth: {},
        headers: {},
      } as any,
      data: {},
    };

    mockContext = {
      switchToWs: () => ({
        getClient: () => mockSocket,
      }),
    } as any;
  });

  describe('canActivate', () => {
    it('should allow connection with valid token from query param', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-123', email: 'test@test.com' };

      mockSocket.handshake!.query = { token };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data!.user).toEqual(payload);
      expect(mockSocket.data!.userId).toBe('user-123');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: process.env.JWT_SECRET,
      });
    });

    it('should allow connection with valid token from auth object', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-456', email: 'test2@test.com' };

      mockSocket.handshake!.auth = { token };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data!.userId).toBe('user-456');
    });

    it('should allow connection with valid token from Authorization header', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-789', email: 'test3@test.com' };

      mockSocket.handshake!.headers = { authorization: `Bearer ${token}` };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockSocket.data!.userId).toBe('user-789');
    });

    it('should reject connection without token', async () => {
      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('No token provided');
    });

    it('should reject connection with invalid token', async () => {
      mockSocket.handshake!.query = { token: 'invalid-token' };
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Unauthorized');
    });

    it('should reject connection with expired token', async () => {
      mockSocket.handshake!.query = { token: 'expired-token' };
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Token expired'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
    });

    it('should handle array of tokens in query param', async () => {
      const token = 'valid-token';
      const payload = { sub: 'user-999', email: 'test4@test.com' };

      mockSocket.handshake!.query = { token: [token, 'other-token'] };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, expect.any(Object));
    });
  });
});
