import { NotFoundError, ValidationError } from '@shared/errors';
import { ChangeThemeUseCase } from './change-theme.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
} from '@shared/testing/mock.types';
import { UserFactory } from '../../../../../../test/factories/user.factory';

describe('ChangeThemeUseCase', () => {
  let useCase: ChangeThemeUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();

    useCase = new ChangeThemeUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería cambiar tema a dark', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'light' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: mockUser.id,
        theme: 'dark',
      });

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        theme: 'dark',
      });
    });

    it('debería cambiar tema a light', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'dark' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: mockUser.id,
        theme: 'light',
      });

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        theme: 'light',
      });
    });

    it('debería permitir establecer el mismo tema actual', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'dark' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          theme: 'dark',
        })
      ).resolves.not.toThrow();
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'invalid-id',
          theme: 'dark',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar error si tema no es válido', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'dark' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          theme: 'invalid-theme',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: mockUser.id,
          theme: 'invalid-theme',
        })
      ).rejects.toThrow('Invalid theme. Must be one of: dark, light');
    });

    it('debería lanzar error para tema vacío', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'dark' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          theme: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería lanzar error para tema con mayúsculas', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'dark' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          theme: 'DARK',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería validar tema ANTES de verificar si usuario existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          theme: 'invalid',
        })
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('NO debería retornar nada (void)', async () => {
      // Arrange
      const mockUser = UserFactory.create({ theme: 'light' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        theme: 'dark',
      });

      // Assert
      expect(result).toBeUndefined();
    });

    it('debería funcionar para usuarios inactivos', async () => {
      // Arrange
      const mockUser = UserFactory.createInactive({ theme: 'light' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          theme: 'dark',
        })
      ).resolves.not.toThrow();
    });
  });
});
