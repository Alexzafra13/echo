import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { createMockExecutionContext, createMockReflector } from '@shared/testing/mock.types';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: ReturnType<typeof createMockReflector>;

  beforeEach(() => {
    mockReflector = createMockReflector();
    guard = new JwtAuthGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('debería permitir acceso si la ruta es pública', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const mockContext = createMockExecutionContext({
        handler: () => {},
        class: class TestController {},
      });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('debería delegar a AuthGuard si la ruta no es pública', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const mockContext = createMockExecutionContext({
        handler: () => {},
        class: class TestController {},
      });

      // When not public, it calls super.canActivate which we can't easily test
      // The important thing is that it doesn't return true immediately
      const result = guard.canActivate(mockContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
      // Result will be a Promise from passport AuthGuard
      expect(result).not.toBe(true);
    });
  });

  describe('handleRequest', () => {
    it('debería retornar el usuario si la autenticación es exitosa', () => {
      const mockUser = { id: 'user-123', username: 'testuser' };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBe(mockUser);
    });

    it('debería lanzar UnauthorizedException si no hay usuario', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null)).toThrow('Invalid token');
    });

    it('debería lanzar el error original si hay un error', () => {
      const mockError = new Error('Custom auth error');

      expect(() => guard.handleRequest(mockError, null, null)).toThrow(mockError);
    });

    it('debería lanzar UnauthorizedException si user es undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
