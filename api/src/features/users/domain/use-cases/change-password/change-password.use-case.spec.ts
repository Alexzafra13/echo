import { NotFoundError, ValidationError, UnauthorizedError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { ChangePasswordUseCase } from './change-password.use-case';
import {
  MockUserRepository,
  MockPasswordService,
  MockLogService,
  createMockUserRepository,
  createMockPasswordService,
  createMockLogService,
} from '@shared/testing/mock.types';

// Helper para crear UserProps con todos los campos requeridos
const createUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 'user-123',
  username: 'juan',
  passwordHash: '$2b$12$old_password_hash',
  name: 'Juan',
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

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let mockUserRepository: MockUserRepository;
  let mockPasswordService: MockPasswordService;
  let mockLogService: MockLogService;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    mockPasswordService = createMockPasswordService();
    mockLogService = createMockLogService();

    useCase = new ChangePasswordUseCase(
      mockUserRepository,
      mockPasswordService,
      mockLogService as any,
    );
  });

  describe('execute', () => {
    it('debería cambiar contraseña correctamente', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_password_hash');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        'OldPass123!',
        '$2b$12$old_password_hash'
      );
      expect(mockPasswordService.hash).toHaveBeenCalledWith('NewPass456!');
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        'user-123',
        '$2b$12$new_password_hash'
      );
    });

    it('debería quitar mustChangePassword si era primer login', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ mustChangePassword: true }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_password_hash');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        currentPassword: 'TempPass123',
        newPassword: 'NewPass456!',
      });

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
        mustChangePassword: false,
      });
    });

    it('NO debería llamar updatePartial si mustChangePassword ya era false', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_password_hash');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: 'user-123',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

      // Assert
      expect(mockUserRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('debería lanzar error si nueva contraseña es muy corta', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'short',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'short',
        })
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'invalid-id',
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar error si contraseña actual es incorrecta', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'WrongPassword',
          newPassword: 'NewPass456!',
        })
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'WrongPassword',
          newPassword: 'NewPass456!',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('debería lanzar error si nueva contraseña es igual a la actual', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps({ passwordHash: '$2b$12$password_hash' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        })
      ).rejects.toThrow('New password must be different from current password');
    });

    it('debería permitir contraseña con exactamente 8 caracteres', async () => {
      // Arrange
      const mockUser = User.reconstruct(createUserProps());

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockPasswordService.hash.mockResolvedValue('$2b$12$new_password_hash');
      mockUserRepository.updatePassword.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: '12345678',
        })
      ).resolves.not.toThrow();
    });
  });
});