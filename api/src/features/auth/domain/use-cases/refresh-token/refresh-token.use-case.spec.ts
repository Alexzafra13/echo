import { UnauthorizedError } from '@shared/errors';
import { User, UserProps } from '../../entities/user.entity';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import {
  MockUserRepository,
  MockTokenService,
  createMockUserRepository,
  createMockTokenService,
  createMockUserProps,
} from '@shared/testing/mock.types';

// Helper para crear mock de usuario
const createMockUser = (overrides: Partial<UserProps> = {}): User => {
  return User.reconstruct(createMockUserProps(overrides));
};

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockUserRepository: MockUserRepository;
  let mockTokenService: MockTokenService;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockTokenService = createMockTokenService();

    useCase = new RefreshTokenUseCase(
      mockUserRepository,
      mockTokenService,
    );
  });

  describe('execute', () => {
    it('debería generar nuevos tokens con refresh token válido', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-123',
        username: 'juan',
      });

      const mockUser = createMockUser({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockResolvedValue('new_access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('new_refresh_token');

      // Act
      const result = await useCase.execute({
        refreshToken: 'old_refresh_token',
      });

      // Assert
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('old_refresh_token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser);
    });

    it('debería lanzar error si refresh token es inválido', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      // Act & Assert
      await expect(
        useCase.execute({
          refreshToken: 'invalid_token',
        }),
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        useCase.execute({
          refreshToken: 'invalid_token',
        }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('debería lanzar error si refresh token está expirado', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockRejectedValue(
        new Error('Token expired'),
      );

      // Act & Assert
      await expect(
        useCase.execute({
          refreshToken: 'expired_token',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-999',
        username: 'noexiste',
      });
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          refreshToken: 'valid_token',
        }),
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        useCase.execute({
          refreshToken: 'valid_token',
        }),
      ).rejects.toThrow('User not found or inactive');
    });

    it('debería lanzar error si usuario está inactivo', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-123',
        username: 'juan',
      });

      const inactiveUser = createMockUser({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
        isActive: false,
      });

      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(
        useCase.execute({
          refreshToken: 'valid_token',
        }),
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        useCase.execute({
          refreshToken: 'valid_token',
        }),
      ).rejects.toThrow('User not found or inactive');
    });

    it('debería lanzar error si refresh token está vacío', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockRejectedValue(
        new Error('Token required'),
      );

      // Act & Assert
      await expect(
        useCase.execute({
          refreshToken: '',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('debería funcionar para usuarios admin', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: 'admin-123',
        username: 'admin',
      });

      const adminUser = createMockUser({
        id: 'admin-123',
        username: 'admin',
        name: 'Admin',
        isAdmin: true,
      });

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockTokenService.generateAccessToken.mockResolvedValue('admin_access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('admin_refresh_token');

      // Act
      const result = await useCase.execute({
        refreshToken: 'admin_old_token',
      });

      // Assert
      expect(result.accessToken).toBe('admin_access_token');
      expect(result.refreshToken).toBe('admin_refresh_token');
    });

    it('debería generar tokens diferentes en cada llamada', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-123',
        username: 'juan',
      });

      const mockUser = createMockUser({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken
        .mockResolvedValueOnce('access_1')
        .mockResolvedValueOnce('access_2');
      mockTokenService.generateRefreshToken
        .mockResolvedValueOnce('refresh_1')
        .mockResolvedValueOnce('refresh_2');

      // Act
      const result1 = await useCase.execute({ refreshToken: 'token_1' });
      const result2 = await useCase.execute({ refreshToken: 'token_2' });

      // Assert
      expect(result1.accessToken).toBe('access_1');
      expect(result2.accessToken).toBe('access_2');
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });
  });
});