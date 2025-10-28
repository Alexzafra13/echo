import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  describe('canActivate', () => {
    it('debería permitir acceso si el usuario es admin', () => {
      const mockContext = createMockContext({
        user: {
          userId: 'admin-123',
          username: 'admin',
          isAdmin: true,
        },
      });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería denegar acceso si el usuario NO es admin', () => {
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'normaluser',
          isAdmin: false,
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Admin access required');
    });

    it('debería denegar acceso si no hay usuario en el request', () => {
      const mockContext = createMockContext({
        user: undefined,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es undefined', () => {
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es null', () => {
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
          isAdmin: null,
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es false explícitamente', () => {
      const mockContext = createMockContext({
        user: {
          userId: 'user-123',
          username: 'testuser',
          isAdmin: false,
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});

function createMockContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}
