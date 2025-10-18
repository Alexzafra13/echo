import { ValidationError } from '@shared/errors';
import { User } from '../../entities/user.entity';
import { RegisterUserUseCase } from './register-user.use-case';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: any;
  let mockTokenService: any;
  let mockPasswordService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    mockPasswordService = {
      hash: jest.fn(),
    };

    useCase = new RegisterUserUseCase(
      mockUserRepository,
      mockTokenService,
      mockPasswordService,
    );
  });

  describe('execute', () => {
    it('debería registrar usuario válido', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockResolvedValue(
        User.reconstruct({
          id: 'user-123',
          username: 'juan',
          email: 'juan@test.com',
          passwordHash: 'hashed_password',
          name: 'Juan',
          isActive: true,
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token');

      // Act
      const result = await useCase.execute({
        username: 'juan',
        email: 'juan@test.com',
        password: 'Pass123!',
        name: 'Juan',
      });

      // Assert
      expect(result.user.username).toBe('juan');
      expect(result.user.email).toBe('juan@test.com');
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
    });

    it('debería registrar usuario sin email', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockResolvedValue(
        User.reconstruct({
          id: 'user-123',
          username: 'juan',
          email: undefined,
          passwordHash: 'hashed_password',
          name: 'Juan',
          isActive: true,
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
      mockTokenService.generateAccessToken.mockResolvedValue('access_token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh_token');

      // Act
      const result = await useCase.execute({
        username: 'juan',
        password: 'Pass123!',
        name: 'Juan',
      });

      // Assert
      expect(result.user.username).toBe('juan');
      expect(result.user.email).toBeUndefined();
    });

    it('debería lanzar error si username ya existe', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(
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

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          email: 'otro@test.com',
          password: 'Pass123!',
        }),
      ).rejects.toThrow('Username already exists');
    });

    it('debería lanzar error si email ya está registrado', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(
        User.reconstruct({
          id: 'user-456',
          username: 'otro',
          email: 'juan@test.com',
          passwordHash: 'hash',
          name: 'Otro',
          isActive: true,
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
        }),
      ).rejects.toThrow('Email already registered');
    });

    it('debería lanzar error si email es inválido', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          email: 'email_invalido',
          password: 'Pass123!',
        }),
      ).rejects.toThrow('Invalid email format');
    });

    it('debería lanzar error si username es inválido', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: 'ab', // Muy corto
          email: 'juan@test.com',
          password: 'Pass123!',
        }),
      ).rejects.toThrow('Username must be 3-50 characters');
    });

    it('debería lanzar error si password es débil', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          username: 'juan',
          email: 'juan@test.com',
          password: 'weak', // Sin mayúsculas, números, caracteres especiales
        }),
      ).rejects.toThrow();
    });
  });
});