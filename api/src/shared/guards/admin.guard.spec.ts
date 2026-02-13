import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { createMockExecutionContext } from '@shared/testing/mock.types';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  describe('canActivate', () => {
    it('debería permitir acceso si el usuario es admin', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'admin-123',
            username: 'admin',
            isAdmin: true,
            isActive: true, // ← AÑADIR
          },
        },
      });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería denegar acceso si el usuario NO es admin', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'normaluser',
            isAdmin: false,
            isActive: true, // ← AÑADIR
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Admin access required');
    });

    it('debería denegar acceso si la cuenta está deshabilitada', () => { // ← NUEVO TEST
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'admin-123',
            username: 'admin',
            isAdmin: true,
            isActive: false, // ← Usuario inactivo
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Account is disabled');
    });

    it('debería denegar acceso si no hay usuario en el request', () => {
      const mockContext = createMockExecutionContext({
        request: { user: undefined },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es undefined', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'testuser',
            isActive: true, // ← AÑADIR
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es null', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'testuser',
            isAdmin: null,
            isActive: true, // ← AÑADIR
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('debería denegar acceso si user.isAdmin es false explícitamente', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'testuser',
            isAdmin: false,
            isActive: true, // ← AÑADIR
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});