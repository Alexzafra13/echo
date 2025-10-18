import { UnauthorizedError } from '@shared/errors';
import { User } from '../../entities/user.entity';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockUserRepository: any;
  let mockTokenService: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
    };

    mockTokenService = {
      verifyRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

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
      mockUserRepository.findById.mockResolvedValue(
        User.reconstruct({
          id: 'user-123',
          username: 'juan',
          email: 'juan@test.com',
          passwordHash: 'hash',
          name: 'Juan',
          isActive: true,
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      mockTokenService.generateAccessToken.mockResolvedValue('new_access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('new_refresh_token');

      // Act
      const result = await useCase.execute({
        refreshToken: 'old_refresh_token',
      });

      // Assert
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
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
      ).rejects.toThrow('Invalid refresh token');
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
      ).rejects.toThrow('User not found or inactive');
    });

    it('debería lanzar error si usuario está inactivo', async () => {
      // Arrange
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-123',
        username: 'juan',
      });
      mockUserRepository.findById.mockResolvedValue(
        User.reconstruct({
          id: 'user-123',
          username: 'juan',
          email: 'juan@test.com',
          passwordHash: 'hash',
          name: 'Juan',
          isActive: false, // Inactivo
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      // Act & Assert
      await expect(
        useCase.execute({
          refreshToken: 'valid_token',
        }),
      ).rejects.toThrow('User not found or inactive');
    });
  });
});