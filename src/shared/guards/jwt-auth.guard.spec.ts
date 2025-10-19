import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new JwtAuthGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('debería permitir acceso si el usuario está autenticado', async () => {
      // Arrange
      const mockContext = createMockContext({
        user: { userId: 'user-123', username: 'testuser' },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería denegar acceso si no hay usuario autenticado', async () => {
      // Arrange
      const mockContext = createMockContext({
        user: undefined,
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });

    it('debería permitir acceso en rutas públicas', async () => {
      // Arrange
      const mockContext = createMockContext({
        user: undefined,
      });

      // Simular que la ruta es pública
      mockReflector.getAllAndOverride.mockReturnValue(true);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería verificar metadata IS_PUBLIC_KEY', () => {
      // Arrange
      const mockContext = createMockContext({});

      mockReflector.getAllAndOverride.mockReturnValue(true);

      // Act
      guard.canActivate(mockContext);

      // Assert
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        'isPublic',
        expect.anything()
      );
    });
  });
});

// Helper para crear mock context
function createMockContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}), // ⬅️ AGREGADO
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}