import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import {
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  ChangeThemeUseCase,
  ChangeLanguageUseCase,
  UpdatePrivacySettingsUseCase,
  UpdateHomePreferencesUseCase,
} from '../domain/use-cases';
import { UploadAvatarUseCase } from '../domain/use-cases/upload-avatar/upload-avatar.use-case';
import { DeleteAvatarUseCase } from '../domain/use-cases/delete-avatar/delete-avatar.use-case';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { MockUseCase, createMockUseCase } from '@shared/testing/mock.types';

describe('UsersController', () => {
  let controller: UsersController;
  let mockChangePasswordUseCase: MockUseCase;
  let mockUpdateProfileUseCase: MockUseCase;
  let mockChangeThemeUseCase: MockUseCase;
  let mockChangeLanguageUseCase: MockUseCase;
  let mockUploadAvatarUseCase: MockUseCase;
  let mockDeleteAvatarUseCase: MockUseCase;
  let mockUpdatePrivacySettingsUseCase: MockUseCase;
  let mockUpdateHomePreferencesUseCase: MockUseCase;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    isAdmin: false,
  };

  beforeEach(async () => {
    mockChangePasswordUseCase = createMockUseCase();
    mockUpdateProfileUseCase = createMockUseCase();
    mockChangeThemeUseCase = createMockUseCase();
    mockChangeLanguageUseCase = createMockUseCase();
    mockUploadAvatarUseCase = createMockUseCase();
    mockDeleteAvatarUseCase = createMockUseCase();
    mockUpdatePrivacySettingsUseCase = createMockUseCase();
    mockUpdateHomePreferencesUseCase = createMockUseCase();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: ChangePasswordUseCase,
          useValue: mockChangePasswordUseCase,
        },
        {
          provide: UpdateProfileUseCase,
          useValue: mockUpdateProfileUseCase,
        },
        {
          provide: ChangeThemeUseCase,
          useValue: mockChangeThemeUseCase,
        },
        {
          provide: ChangeLanguageUseCase,
          useValue: mockChangeLanguageUseCase,
        },
        {
          provide: UploadAvatarUseCase,
          useValue: mockUploadAvatarUseCase,
        },
        {
          provide: DeleteAvatarUseCase,
          useValue: mockDeleteAvatarUseCase,
        },
        {
          provide: UpdatePrivacySettingsUseCase,
          useValue: mockUpdatePrivacySettingsUseCase,
        },
        {
          provide: UpdateHomePreferencesUseCase,
          useValue: mockUpdateHomePreferencesUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('PUT /users/password - changePassword', () => {
    it('debería cambiar la contraseña correctamente', async () => {
      // Arrange
      const dto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      };

      mockChangePasswordUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.changePassword(mockUser, dto);

      // Assert
      expect(mockChangePasswordUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });
    });

    it('debería usar el userId del usuario autenticado', async () => {
      // Arrange
      const dto = {
        currentPassword: 'current',
        newPassword: 'new',
      };

      const differentUser = {
        id: 'user-999',
        username: 'otheruser',
        isAdmin: false,
      };

      mockChangePasswordUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.changePassword(differentUser, dto);

      // Assert
      expect(mockChangePasswordUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-999',
        currentPassword: 'current',
        newPassword: 'new',
      });
    });

    it('debería propagar errores del use case', async () => {
      // Arrange
      const dto = {
        currentPassword: 'wrong',
        newPassword: 'new',
      };

      mockChangePasswordUseCase.execute.mockRejectedValue(
        new Error('Current password is incorrect')
      );

      // Act & Assert
      await expect(controller.changePassword(mockUser, dto)).rejects.toThrow(
        'Current password is incorrect'
      );
    });
  });

  describe('PUT /users/profile - updateProfile', () => {
    it('debería actualizar el perfil correctamente', async () => {
      // Arrange
      const dto = {
        name: 'Updated Name',
      };

      const useCaseResponse = {
        id: 'user-123',
        username: 'testuser',
        name: 'Updated Name',
      };

      mockUpdateProfileUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.updateProfile(mockUser, dto);

      // Assert
      expect(mockUpdateProfileUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'Updated Name',
      });
      expect(result).toMatchObject({
        id: 'user-123',
        username: 'testuser',
        name: 'Updated Name',
        avatarUrl: '/api/images/users/user-123/avatar',
      });
    });

    it('debería actualizar solo el nombre', async () => {
      // Arrange
      const dto = {
        name: 'Only Name',
      };

      const useCaseResponse = {
        id: 'user-123',
        username: 'testuser',
        name: 'Only Name',
      };

      mockUpdateProfileUseCase.execute.mockResolvedValue(useCaseResponse);

      // Act
      const result = await controller.updateProfile(mockUser, dto);

      // Assert
      expect(mockUpdateProfileUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        name: 'Only Name',
      });
    });
  });

  describe('PUT /users/theme - changeTheme', () => {
    it('debería cambiar el tema a dark', async () => {
      // Arrange
      const dto = {
        theme: 'dark',
      };

      mockChangeThemeUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.changeTheme(mockUser, dto);

      // Assert
      expect(mockChangeThemeUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        theme: 'dark',
      });
    });

    it('debería cambiar el tema a light', async () => {
      // Arrange
      const dto = {
        theme: 'light',
      };

      mockChangeThemeUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.changeTheme(mockUser, dto);

      // Assert
      expect(mockChangeThemeUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        theme: 'light',
      });
    });

    it('debería propagar errores de validación', async () => {
      // Arrange
      const dto = {
        theme: 'invalid',
      };

      mockChangeThemeUseCase.execute.mockRejectedValue(
        new Error('Invalid theme')
      );

      // Act & Assert
      await expect(controller.changeTheme(mockUser, dto)).rejects.toThrow(
        'Invalid theme'
      );
    });
  });

  describe('PUT /users/language - changeLanguage', () => {
    it('debería cambiar el idioma a español', async () => {
      // Arrange
      const dto = {
        language: 'es',
      };

      mockChangeLanguageUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.changeLanguage(mockUser, dto);

      // Assert
      expect(mockChangeLanguageUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        language: 'es',
      });
    });

    it('debería cambiar el idioma a inglés', async () => {
      // Arrange
      const dto = {
        language: 'en',
      };

      mockChangeLanguageUseCase.execute.mockResolvedValue(undefined);

      // Act
      await controller.changeLanguage(mockUser, dto);

      // Assert
      expect(mockChangeLanguageUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        language: 'en',
      });
    });

    it('debería propagar errores de validación', async () => {
      // Arrange
      const dto = {
        language: 'fr',
      };

      mockChangeLanguageUseCase.execute.mockRejectedValue(
        new Error('Invalid language')
      );

      // Act & Assert
      await expect(controller.changeLanguage(mockUser, dto)).rejects.toThrow(
        'Invalid language'
      );
    });
  });
});