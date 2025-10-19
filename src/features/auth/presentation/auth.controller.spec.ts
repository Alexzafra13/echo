import { UnauthorizedError } from '@shared/errors';
import { AuthController } from './auth.controller';
import { LoginRequestDto } from './dtos';

describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: any;
  let mockRefreshTokenUseCase: any;

  beforeEach(() => {
    mockLoginUseCase = {
      execute: jest.fn(),
    };

    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    };

    controller = new AuthController(
      mockLoginUseCase,
      mockRefreshTokenUseCase,
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
          email: 'test@test.com',
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
          email: 'new@test.com',
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
      const mockUser = {
        userId: 'user-123',
        username: 'testuser',
        isAdmin: false,
      };

      // Act
      const result = await controller.me(mockUser);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual(mockUser);
    });
  });
});