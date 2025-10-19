import { ConflictError, ValidationError } from '@shared/errors';
import { User } from '@features/auth/domain/entities/user.entity';
import { CreateUserUseCase } from './create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: any;
  let mockPasswordService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockPasswordService = {
      hash: jest.fn(),
    };

    useCase = new CreateUserUseCase(
      mockUserRepository,
      mockPasswordService,
    );
  });

  describe('execute', () => {
    it('debería crear un usuario correctamente', async () => {
      // Arrange
      const input = {
        username: 'juanperez',
        email: 'juan@test.com',
        name: 'Juan Pérez',
        isAdmin: false,
      };

      const mockCreatedUser = User.reconstruct({
        id: 'user-123',
        username: 'juanperez',
        email: 'juan@test.com',
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
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('juanperez');
      expect(result.user.email).toBe('juan@test.com');
      expect(result.user.name).toBe('Juan Pérez');
      expect(result.user.isAdmin).toBe(false);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword).toMatch(/^\d{6}$/);
    });

    it('debería crear un usuario admin', async () => {
      // Arrange
      const input = {
        username: 'admin',
        email: 'admin@test.com',
        name: 'Admin User',
        isAdmin: true,
      };

      const mockCreatedUser = User.reconstruct({
        id: 'admin-123',
        username: 'admin',
        email: 'admin@test.com',
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
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.user.isAdmin).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
    });

    it('debería crear usuario sin email', async () => {
      // Arrange
      const input = {
        username: 'maria',
        name: 'María García',
      };

      const mockCreatedUser = User.reconstruct({
        id: 'user-456',
        username: 'maria',
        email: undefined,
        passwordHash: '$2b$12$hashed_temp_password',
        name: 'María García',
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
      expect(result.user.email).toBeUndefined();
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('debería lanzar error si username es muy corto', async () => {
      // Arrange
      const input = {
        username: 'ab',
        email: 'test@test.com',
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
        email: 'nuevo@test.com',
      };

      const existingUser = User.reconstruct({
        id: 'existing-123',
        username: 'existente',
        email: 'otro@test.com',
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

    it('debería lanzar error si email ya existe', async () => {
      // Arrange
      const input = {
        username: 'nuevo',
        email: 'existente@test.com',
      };

      const existingUser = User.reconstruct({
        id: 'existing-456',
        username: 'otro',
        email: 'existente@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(input)).rejects.toThrow('Email already exists');
    });

    it('debería generar contraseña temporal de 6 dígitos', async () => {
      // Arrange
      const input = {
        username: 'test',
        email: 'test@test.com',
      };

      const mockCreatedUser = User.reconstruct({
        id: 'user-999',
        username: 'test',
        email: 'test@test.com',
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
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed_temp_password');
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.temporaryPassword).toMatch(/^\d{6}$/);
      expect(result.temporaryPassword.length).toBe(6);
    });
  });
});