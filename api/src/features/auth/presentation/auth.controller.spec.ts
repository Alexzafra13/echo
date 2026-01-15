import { UnauthorizedError } from '@shared/errors';
import { AuthController } from './auth.controller';
import { LoginRequestDto } from './dtos';
import { JwtUser } from '@shared/types/request.types';
import { IUserRepository } from '../../domain/ports';
import { LoginUseCase } from '../../domain/use-cases/login';
import { RefreshTokenUseCase } from '../../domain/use-cases/refresh-token';
import { LogoutUseCase } from '../../domain/use-cases/logout';

interface MockLoginUseCase {
  execute: jest.Mock;
}

interface MockRefreshTokenUseCase {
  execute: jest.Mock;
}

interface MockLogoutUseCase {
  execute: jest.Mock;
}

interface MockUserRepository {
  findById: jest.Mock;
  findByUsername: jest.Mock;
}

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: MockLoginUseCase;
  let mockRefreshTokenUseCase: MockRefreshTokenUseCase;
  let mockLogoutUseCase: MockLogoutUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockLoginUseCase = {
      execute: jest.fn(),
    };

    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    };

    mockLogoutUseCase = {
      execute: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
    };

    controller = new AuthController(
      mockLoginUseCase as unknown as LoginUseCase,
      mockRefreshTokenUseCase as unknown as RefreshTokenUseCase,
      mockLogoutUseCase as unknown as LogoutUseCase,
      mockUserRepository as unknown as IUserRepository,
    );
  });

  describe('POST /auth/login', () => {
    it('debería retornar tokens válidos en login exitoso', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        username: 'testuser',
        password: 'Pass123!',
      };

      mockLoginUseCase.execute.mockResolvedValue({
        user: {
          id: 'user-123',
          username: 'testuser',
          name: 'Test User',
          isAdmin: false,
        },
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        mustChangePassword: false,
      });

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('mustChangePassword');
      expect(result.user.username).toBe('testuser');
      expect(result.mustChangePassword).toBe(false);
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'Pass123!',
      });
    });

    it('debería retornar mustChangePassword true para usuarios nuevos', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        username: 'newuser',
        password: '123456',
      };

      mockLoginUseCase.execute.mockResolvedValue({
        user: {
          id: 'user-456',
          username: 'newuser',
          isAdmin: false,
        },
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        mustChangePassword: true,
      });

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result.mustChangePassword).toBe(true);
    });

    it('debería lanzar error 401 con credenciales inválidas', async () => {
      // Arrange
      mockLoginUseCase.execute.mockRejectedValue(
        new UnauthorizedError('Invalid credentials'),
      );

      // Act & Assert
      await expect(
        controller.login({
          username: 'testuser',
          password: 'Wrong',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debería lanzar error si username está vacío', async () => {
      // Arrange
      mockLoginUseCase.execute.mockRejectedValue(
        new UnauthorizedError('Invalid credentials'),
      );

      // Act & Assert
      await expect(
        controller.login({
          username: '',
          password: 'Pass123!',
        }),
      ).rejects.toThrow();
    });

    it('debería lanzar error si password está vacío', async () => {
      // Arrange
      mockLoginUseCase.execute.mockRejectedValue(
        new UnauthorizedError('Invalid credentials'),
      );

      // Act & Assert
      await expect(
        controller.login({
          username: 'testuser',
          password: '',
        }),
      ).rejects.toThrow();
    });
  });

  describe('POST /auth/refresh', () => {
    it('debería generar nuevos tokens', async () => {
      // Arrange
      mockRefreshTokenUseCase.execute.mockResolvedValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });

      // Act
      const result = await controller.refreshToken({
        refreshToken: 'old_refresh_token',
      });

      // Assert
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith({
        refreshToken: 'old_refresh_token',
      });
    });

    it('debería lanzar error con token inválido', async () => {
      // Arrange
      mockRefreshTokenUseCase.execute.mockRejectedValue(
        new UnauthorizedError('Invalid refresh token'),
      );

      // Act & Assert
      await expect(
        controller.refreshToken({
          refreshToken: 'invalid_token',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debería lanzar error con token expirado', async () => {
      // Arrange
      mockRefreshTokenUseCase.execute.mockRejectedValue(
        new UnauthorizedError('Token expired'),
      );

      // Act & Assert
      await expect(
        controller.refreshToken({
          refreshToken: 'expired_token',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('GET /auth/me', () => {
    it('debería retornar el usuario autenticado', async () => {
      // Arrange
      const jwtUser: Partial<JwtUser> = {
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
      };

      // Mock repository to return fresh user data
      const freshUser = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
        avatarPath: null,
        createdAt: new Date(),
      };
      mockUserRepository.findById.mockResolvedValue(freshUser);

      // Act
      const result = await controller.me(jwtUser as JwtUser);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('testuser');
      expect(result.user.hasAvatar).toBe(false);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('debería retornar hasAvatar true si el usuario tiene avatar', async () => {
      // Arrange
      const jwtUser: Partial<JwtUser> = {
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
      };

      const freshUser = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
        avatarPath: '/uploads/avatars/user-123.jpg',
        createdAt: new Date(),
      };
      mockUserRepository.findById.mockResolvedValue(freshUser);

      // Act
      const result = await controller.me(jwtUser as JwtUser);

      // Assert
      expect(result.user.hasAvatar).toBe(true);
    });

    it('debería retornar datos del JWT si el usuario no existe en la BD', async () => {
      // Arrange
      const jwtUser: Partial<JwtUser> = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
        avatarPath: null,
        createdAt: new Date(),
      };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await controller.me(jwtUser as JwtUser);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('testuser');
      expect(result.user.isAdmin).toBe(false);
      expect(result.user.hasAvatar).toBe(false);
    });
  });
});