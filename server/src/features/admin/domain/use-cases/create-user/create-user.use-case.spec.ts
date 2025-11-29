import { ConflictError, ValidationError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { CreateUserUseCase } from './create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: any;
  let mockPasswordService: any;
  let mockLogService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByUsername: jest.fn(),
      create: jest.fn(),
    };

    mockPasswordService = {
      hash: jest.fn(),
    };

    mockLogService = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    };

    useCase = new CreateUserUseCase(
      mockUserRepository,
      mockPasswordService,
      mockLogService,
    );
  });

  describe('execute', () => {
    it('debería crear un usuario correctamente', async () => {
      // Arrange
      const input = {
        username: 'juanperez',
        name: 'Juan Pérez',
        isAdmin: false,
      };

      const mockCreatedUser = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        passwordHash: '$2b$12$hashed_temp_password',
        name: 'Juan Pérez',
        isActive: true,
        isAdmin: false,
        mustChangePassword: true,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('juanperez');
      expect(result.user.name).toBe('Juan Pérez');
      expect(result.user.isAdmin).toBe(false);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it('debería crear un usuario admin', async () => {
      // Arrange
      const input = {
        username: 'admin',
        name: 'Admin User',
        isAdmin: true,
      };

      const mockCreatedUser = User.reconstruct({
        id: 'admin-123',
        username: 'admin',
        passwordHash: '$2b$12$hashed_temp_password',
        name: 'Admin User',
        isActive: true,
        isAdmin: true,
        mustChangePassword: true,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.user.isAdmin).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
    });

    it('debería crear usuario sin nombre', async () => {
      // Arrange
      const input = {
        username: 'maria',
      };

      const mockCreatedUser = User.reconstruct({
        id: 'user-456',
        username: 'maria',
        passwordHash: '$2b$12$hashed_temp_password',
        name: undefined,
        isActive: true,
        isAdmin: false,
        mustChangePassword: true,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.user.name).toBeUndefined();
    });

    it('debería lanzar error si username es muy corto', async () => {
      // Arrange
      const input = {
        username: 'ab',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Username must be at least 3 characters'
      );
    });

    it('debería lanzar error si username ya existe', async () => {
      // Arrange
      const input = {
        username: 'existente',
      };

      const existingUser = User.reconstruct({
        id: 'existing-123',
        username: 'existente',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
    });

    it('debería generar contraseña temporal de 8 caracteres', async () => {
      // Arrange
      const input = {
        username: 'test',
      };

      const mockCreatedUser = User.reconstruct({
        id: 'user-999',
        username: 'test',
        passwordHash: '$2b$12$hashed_temp_password',
        isActive: true,
        isAdmin: false,
        mustChangePassword: true,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(result.temporaryPassword.length).toBe(8);
    });
  });
});
