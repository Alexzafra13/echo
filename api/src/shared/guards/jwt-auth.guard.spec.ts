import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { createMockExecutionContext } from '@shared/testing/mock.types';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(mockReflector as unknown as Reflector);
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
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('debería llamar a super.canActivate si la ruta no es pública', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const mockContext = createMockExecutionContext({
        handler: () => {},
        class: class TestController {},
      });

      // Spy on the parent's canActivate to avoid passport execution
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(Promise.resolve(true));

      const result = guard.canActivate(mockContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);

      superCanActivateSpy.mockRestore();
    });

    it('debería verificar la clave IS_PUBLIC_KEY con handler y class', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const handler = () => {};
      class TestController {}

      const mockContext = createMockExecutionContext({
        handler,
        class: TestController,
      });

      guard.canActivate(mockContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        'isPublic',
        expect.any(Array),
      );
    });
  });

  describe('handleRequest', () => {
    interface MockUser {
      id: string;
      username: string;
    }

    it('debería retornar el usuario si la autenticación es exitosa', () => {
      const mockUser: MockUser = { id: 'user-123', username: 'testuser' };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toBe(mockUser);
    });

    it('debería lanzar UnauthorizedException si no hay usuario', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null)).toThrow('Invalid or expired token');
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

    it('debería priorizar el error sobre la falta de usuario', () => {
      const customError = new UnauthorizedException('Custom error');

      expect(() => guard.handleRequest(customError, { id: '123' }, null)).toThrow(
        customError,
      );
    });
  });
});
