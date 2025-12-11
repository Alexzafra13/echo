import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import { createMockExecutionContext } from '@shared/testing/mock.types';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;
    guard = new AdminGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('debería permitir acceso si la ruta es pública', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const mockContext = createMockExecutionContext({
        request: { user: undefined },
      });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería permitir acceso si el usuario es admin', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'admin-123',
            username: 'admin',
            isAdmin: true,
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
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Admin access required');
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
          },
        },
      });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});
