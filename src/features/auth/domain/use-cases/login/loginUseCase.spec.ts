import { UnauthorizedError } from '@shared/errors';
import { User } from '../../entities/user.entity';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepository: any;
  let mockTokenService: any;
  let mockPasswordService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByUsername: jest.fn(),
    };

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    mockPasswordService = {
      compare: jest.fn(),
    };

    useCase = new LoginUseCase(
      mockUserRepository,
      mockTokenService,
      mockPasswordService,
    );
  });

  describe('execute', () => {
    it('debería loguear un usuario válido', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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
      expect(result.user.email).toBe('juan@test.com');
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
      ).rejects.toThrow('Invalid credentials');
    });

    it('debería lanzar error si username falta', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: '',
          password: 'Pass123!',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('debería lanzar error si password falta', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          password: '',
        }),
      ).rejects.toThrow('Invalid credentials');
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
      ).rejects.toThrow('Invalid credentials');
    });

    it('debería lanzar error si usuario está inactivo', async () => {
      // Arrange
      const inactiveUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan',
        isActive: false, // ← Inactivo
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          password: 'Pass123!',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('debería lanzar error si password es incorrecto', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false); // ← Password incorrecto

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('debería retornar sin email si el usuario no tiene', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: undefined, // ← Sin email
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token');

      // Act
      const result = await useCase.execute({
        username: 'juan',
        password: 'Pass123!',
      });

      // Assert
      expect(result.user.email).toBeUndefined();
      expect(result.user.username).toBe('juan');
    });

    it('debería generar tokens correctamente', async () => {
      // Arrange
      const mockUser = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed_password',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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