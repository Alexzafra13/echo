import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StreamTokenGuard } from './stream-token.guard';
import { StreamTokenService } from '../../infrastructure/services/stream-token.service';
import { UnauthorizedError } from '@shared/errors';

describe('StreamTokenGuard', () => {
  let guard: StreamTokenGuard;
  let streamTokenService: jest.Mocked<StreamTokenService>;

  beforeEach(async () => {
    const mockStreamTokenService = {
      validateToken: jest.fn(),
      generateToken: jest.fn(),
      revokeToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamTokenGuard,
        {
          provide: StreamTokenService,
          useValue: mockStreamTokenService,
        },
      ],
    }).compile();

    guard = module.get<StreamTokenGuard>(StreamTokenGuard);
    streamTokenService = module.get(StreamTokenService);
  });

  const createMockContext = (query: Record<string, unknown> = {}): ExecutionContext => {
    const mockRequest = {
      query,
      user: undefined as unknown,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('debería permitir acceso con token válido', async () => {
      // Arrange
      const context = createMockContext({ token: 'valid-token-123' });
      streamTokenService.validateToken.mockResolvedValue('user-123');

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(streamTokenService.validateToken).toHaveBeenCalledWith('valid-token-123');

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({ userId: 'user-123' });
    });

    it('debería lanzar UnauthorizedError si no hay token', async () => {
      // Arrange
      const context = createMockContext({});

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
      await expect(guard.canActivate(context)).rejects.toThrow('Stream token is required');
      expect(streamTokenService.validateToken).not.toHaveBeenCalled();
    });

    it('debería lanzar UnauthorizedError si token es undefined', async () => {
      // Arrange
      const context = createMockContext({ token: undefined });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
      await expect(guard.canActivate(context)).rejects.toThrow('Stream token is required');
    });

    it('debería lanzar UnauthorizedError si token no es string', async () => {
      // Arrange
      const context = createMockContext({ token: 12345 });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
      await expect(guard.canActivate(context)).rejects.toThrow('Stream token is required');
    });

    it('debería lanzar UnauthorizedError si token es inválido', async () => {
      // Arrange
      const context = createMockContext({ token: 'invalid-token' });
      streamTokenService.validateToken.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedError);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired stream token');
      expect(streamTokenService.validateToken).toHaveBeenCalledWith('invalid-token');
    });

    it('debería lanzar UnauthorizedError si token está expirado', async () => {
      // Arrange
      const context = createMockContext({ token: 'expired-token' });
      streamTokenService.validateToken.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired stream token');
    });

    it('debería manejar tokens con caracteres especiales', async () => {
      // Arrange
      const specialToken = 'token+with/special=chars';
      const context = createMockContext({ token: specialToken });
      streamTokenService.validateToken.mockResolvedValue('user-456');

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(streamTokenService.validateToken).toHaveBeenCalledWith(specialToken);
    });

    it('debería adjuntar userId al request', async () => {
      // Arrange
      const context = createMockContext({ token: 'valid-token' });
      streamTokenService.validateToken.mockResolvedValue('user-789');

      // Act
      await guard.canActivate(context);

      // Assert
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({ userId: 'user-789' });
    });
  });
});
