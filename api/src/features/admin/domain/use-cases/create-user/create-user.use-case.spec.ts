import { ConflictError, ValidationError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { LogService } from '@features/logs/application/log.service';
import { CreateUserUseCase } from './create-user.use-case';
import {
  MockUserRepository,
  MockPasswordService,
  MockLogService,
  createMockUserRepository,
  createMockPasswordService,
  createMockLogService,
} from '@shared/testing/mock.types';

// Helper to create mock user with all required fields
const createMockUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 'user-123',
  username: 'testuser',
  passwordHash: '$2b$12$hashed',
  isActive: true,
  isAdmin: false,
  mustChangePassword: false,
  theme: 'dark',
  language: 'es',
  isPublicProfile: false,
  showTopTracks: true,
  showTopArtists: true,
  showTopAlbums: true,
  showPlaylists: true,
  homeSections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: MockUserRepository;
  let mockPasswordService: MockPasswordService;
  let mockLogService: MockLogService;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockPasswordService = createMockPasswordService();
    mockLogService = createMockLogService();

    useCase = new CreateUserUseCase(
      mockUserRepository,
      mockPasswordService,
      mockLogService as unknown as LogService,
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

      const mockCreatedUser = User.reconstruct(createMockUserProps({
        id: 'user-123',
        username: 'juanperez',
        passwordHash: '$2b$12$hashed_temp_password',
        name: 'Juan Pérez',
        isAdmin: false,
        mustChangePassword: true,
      }));

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

      const mockCreatedUser = User.reconstruct(createMockUserProps({
        id: 'admin-123',
        username: 'admin',
        passwordHash: '$2b$12$hashed_temp_password',
        name: 'Admin User',
        isAdmin: true,
        mustChangePassword: true,
      }));

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

      const mockCreatedUser = User.reconstruct(createMockUserProps({
        id: 'user-456',
        username: 'maria',
        passwordHash: '$2b$12$hashed_temp_password',
        name: undefined,
        mustChangePassword: true,
      }));

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

      const existingUser = User.reconstruct(createMockUserProps({
        id: 'existing-123',
        username: 'existente',
      }));

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

      const mockCreatedUser = User.reconstruct(createMockUserProps({
        id: 'user-999',
        username: 'test',
        passwordHash: '$2b$12$hashed_temp_password',
        mustChangePassword: true,
      }));

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
