import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  describe('canActivate', () => {
    it('debería permitir acceso si el usuario es admin', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'admin-123',
          username: 'admin',
          isAdmin: true,
        },
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('debería denegar acceso si el usuario NO es admin', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'normaluser',
          isAdmin: false,
        },
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin access required'
      );
    });

    it('debería denegar acceso si no hay usuario en el request', () => {
      // Arrange
      const mockContext = createMockContext({
        user: undefined,
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es undefined', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
        },
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es null', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
          isAdmin: null,
        },
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es false explícitamente', () => {
      // Arrange
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
          isAdmin: false,
        },
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});

// Helper para crear mock context
function createMockContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}