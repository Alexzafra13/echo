import { UnauthorizedError, ValidationError } from '@shared/errors';
import { User, UserProps } from '../../entities/user.entity';
import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '../../ports/user-repository.port';
import { IPasswordService } from '../../ports/password-service.port';
import { ITokenService } from '../../ports/token-service.port';
import { createMockUserProps } from '@shared/testing/mock.types';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockPasswordService: jest.Mocked<IPasswordService>;

  // Helper para crear mock de usuario con valores por defecto
  const createMockUser = (overrides: Partial<UserProps> = {}): User => {
    return User.reconstruct(createMockUserProps({
      username: 'juan',
      passwordHash: '$2b$12$hashed_password',
      name: 'Juan',
      ...overrides,
    }));
  };

  beforeEach(() => {
    mockUserRepository = {
      findByUsername: jest.fn(),
      updatePartial: jest.fn(),
    } as any;

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    } as any;

    mockPasswordService = {
      compare: jest.fn(),
    } as any;

    const mockLogService = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;

    useCase = new LoginUseCase(
      mockUserRepository,
      mockPasswordService,
      mockTokenService,
      mockLogService,
    );
  });

  describe('execute', () => {
    it('debería loguear un usuario válido', async () => {
      // Arrange
      const mockUser = createMockUser();

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access_token_123');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token_123');

      // Act
      const result = await useCase.execute({
        username: 'juan',
        password: 'Pass123!',
      });

      // Assert
      expect(result.user.username).toBe('juan');
      expect(result.user.id).toBe('user-123');
      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_123');
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('juan');
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        'Pass123!',
        '$2b$12$hashed_password',
      );
    });

    it('debería lanzar error si username y password están vacíos', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: '',
          password: '',
        }),
      ).rejects.toThrow(new ValidationError('Username and password are required'));
    });

    it('debería lanzar error si username falta', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: '',
          password: 'Pass123!',
        }),
      ).rejects.toThrow(new ValidationError('Username and password are required'));
    });

    it('debería lanzar error si password falta', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          password: '',
        }),
      ).rejects.toThrow(new ValidationError('Username and password are required'));
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'noexiste',
          password: 'Pass123!',
        }),
      ).rejects.toThrow(new UnauthorizedError('Invalid credentials'));
    });

    it('debería lanzar error si usuario está inactivo', async () => {
      // Arrange
      const inactiveUser = createMockUser({ isActive: false });
      mockUserRepository.findByUsername.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          password: 'Pass123!',
        }),
      ).rejects.toThrow(new UnauthorizedError('Account is inactive'));
    });

    it('debería lanzar error si password es incorrecto', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(new UnauthorizedError('Invalid credentials'));
    });

    it('debería generar tokens correctamente', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token');

      // Act
      await useCase.execute({
        username: 'juan',
        password: 'Pass123!',
      });

      // Assert
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser);
    });
  });
});
