import { ForbiddenException } from '@nestjs/common';
import { MustChangePasswordGuard } from './must-change-password.guard';
import { createMockExecutionContext, createMockReflector } from '@shared/testing/mock.types';
import { ALLOW_CHANGE_PASSWORD_KEY } from '../decorators/allow-change-password.decorator';

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let mockReflector: ReturnType<typeof createMockReflector>;

  beforeEach(() => {
    mockReflector = createMockReflector();
    guard = new MustChangePasswordGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('debería permitir acceso si mustChangePassword es false', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'testuser',
            mustChangePassword: false,
          },
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería denegar acceso si mustChangePassword es true', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'newuser',
            mustChangePassword: true,
          },
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'You must change your password before accessing the system',
      );
    });

    it('debería permitir acceso a rutas con decorator AllowChangePassword', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'newuser',
            mustChangePassword: true,
          },
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería permitir acceso si no hay usuario (caso edge)', () => {
      const mockContext = createMockExecutionContext({
        request: { user: undefined },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería permitir acceso si mustChangePassword es undefined', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            username: 'testuser',
          },
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('debería verificar metadata ALLOW_CHANGE_PASSWORD_KEY', () => {
      const mockContext = createMockExecutionContext({
        request: {
          user: {
            userId: 'user-123',
            mustChangePassword: true,
          },
        },
      });

      mockReflector.getAllAndOverride.mockReturnValue(true);

      guard.canActivate(mockContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        ALLOW_CHANGE_PASSWORD_KEY,
        expect.anything(),
      );
    });
  });
});