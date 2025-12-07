import { NotFoundError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { LogService } from '@features/logs/application/log.service';
import { ResetUserPasswordUseCase } from './reset-user-password.use-case';
import {
  MockUserRepository,
  MockPasswordService,
  MockLogService,
  createMockUserRepository,
  createMockPasswordService,
  createMockLogService,
  createMockUserProps,
} from '@shared/testing/mock.types';

// Helper para crear mock de usuario
const createMockUser = (overrides: Partial<UserProps> = {}): User => {
  return User.reconstruct(createMockUserProps(overrides));
};

describe('ResetUserPasswordUseCase', () => {
  let useCase: ResetUserPasswordUseCase;
  let mockUserRepository: MockUserRepository;
  let mockPasswordService: MockPasswordService;
  let mockLogService: MockLogService;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockPasswordService = createMockPasswordService();
    mockLogService = createMockLogService();

    useCase = new ResetUserPasswordUseCase(
      mockUserRepository,
      mockPasswordService,
      mockLogService as unknown as LogService,
    );
  });

  describe('execute', () => {
    it('debería resetear la contraseña del usuario correctamente', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        passwordHash: '$2b$12$old_hashed_password',
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_hashed_password');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'user-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockPasswordService.hash).toHaveBeenCalled();
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        '$2b$12$new_hashed_password'
      );
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        mustChangePassword: true,
      });
      expect(result.temporaryPassword).toBeDefined();
      expect(typeof result.temporaryPassword).toBe('string');
    });

    it('debería generar una contraseña temporal alfanumérica de 8 caracteres', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_hashed');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'user-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(result.temporaryPassword.length).toBe(8);
    });

    it('debería marcar mustChangePassword como true', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_hashed');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'user-123',
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        mustChangePassword: true,
      });
    });

    it('debería funcionar para usuarios admin', async () => {
      // Arrange
      const adminUser = createMockUser({
        id: 'admin-123',
        username: 'admin',
        name: 'Admin User',
        isAdmin: true,
      });

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_hashed');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'admin-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.temporaryPassword).toBeDefined();
      expect(mockUserRepository.updatePassword).toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('admin-123', {
        mustChangePassword: true,
      });
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const input = {
        userId: 'nonexistent-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería hashear la contraseña temporal antes de guardarla', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        passwordHash: '$2b$12$old_hash',
        name: 'Juan Pérez',
      });

      let capturedPlainPassword: string | undefined;

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockPasswordService.hash.mockImplementation((password: string) => {
        capturedPlainPassword = password;
        return Promise.resolve('$2b$12$' + password + '_hashed');
      });
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'user-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(mockPasswordService.hash).toHaveBeenCalledWith(result.temporaryPassword);
      expect(capturedPlainPassword).toBe(result.temporaryPassword);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        expect.stringContaining('_hashed')
      );
    });

    it('debería generar contraseñas diferentes en cada ejecución', async () => {
      // Arrange
      const existingUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
      });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'user-123',
      };

      // Act
      const result1 = await useCase.execute(input);
      const result2 = await useCase.execute(input);
      const result3 = await useCase.execute(input);

      // Assert
      expect(result1.temporaryPassword).not.toBe(result2.temporaryPassword);
      expect(result2.temporaryPassword).not.toBe(result3.temporaryPassword);
      expect(result1.temporaryPassword).not.toBe(result3.temporaryPassword);
    });

    it('debería funcionar para usuarios inactivos', async () => {
      // Arrange
      const inactiveUser = createMockUser({
        id: 'user-123',
        username: 'juanperez',
        name: 'Juan Pérez',
        isActive: false,
      });

      mockUserRepository.findById.mockResolvedValue(inactiveUser);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_hashed');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      const input = {
        userId: 'user-123',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.temporaryPassword).toBeDefined();
      // Permite resetear contraseña incluso para usuarios inactivos
      // (útil si el admin quiere reactivarlos después)
    });
  });
});
