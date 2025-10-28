import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new MustChangePasswordGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('debería permitir acceso si mustChangePassword es false', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
          mustChangePassword: false,
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería denegar acceso si mustChangePassword es true', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'newuser',
          mustChangePassword: true,
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'You must change your password before accessing the system' // ⬅️ CORREGIDO
      );
    });

    it('debería permitir acceso a rutas con decorator AllowChangePassword', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'newuser',
          mustChangePassword: true,
        },
      });

      // Simular que la ruta tiene el decorator AllowChangePassword
      mockReflector.getAllAndOverride.mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería permitir acceso si no hay usuario (caso edge)', () => {
      // Arrange
      const mockContext = createMockContext({
        user: undefined,
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería permitir acceso si mustChangePassword es undefined', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
          // mustChangePassword no está definido
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería verificar metadata ALLOW_CHANGE_PASSWORD_KEY', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          mustChangePassword: true,
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(true);

      // Act
      guard.canActivate(mockContext);

      // Assert
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        'allowChangePassword',
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
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}