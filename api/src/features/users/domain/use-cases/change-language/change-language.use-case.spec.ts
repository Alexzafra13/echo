import { NotFoundError, ValidationError } from '@shared/errors';
import { ChangeLanguageUseCase } from './change-language.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
} from '@shared/testing/mock.types';
import { UserFactory } from '../../../../../../test/factories/user.factory';

describe('ChangeLanguageUseCase', () => {
  let useCase: ChangeLanguageUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();

    useCase = new ChangeLanguageUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería cambiar idioma a español', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'en' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: mockUser.id,
        language: 'es',
      });

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        language: 'es',
      });
    });

    it('debería cambiar idioma a inglés', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'es' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      await useCase.execute({
        userId: mockUser.id,
        language: 'en',
      });

      // Assert
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        language: 'en',
      });
    });

    it('debería permitir establecer el mismo idioma actual', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'es' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          language: 'es',
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
          language: 'es',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar error si idioma no es válido', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'es' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          language: 'fr',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        useCase.execute({
          userId: mockUser.id,
          language: 'fr',
        })
      ).rejects.toThrow('Invalid language. Must be one of: es, en');
    });

    it('debería lanzar error para idioma vacío', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'es' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          language: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería lanzar error para idioma con mayúsculas', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'es' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          language: 'ES',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('debería validar idioma ANTES de verificar si usuario existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'user-123',
          language: 'fr',
        })
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('debería rechazar códigos de idioma con región', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'es' });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      const regionalCodes = ['es-ES', 'es-MX', 'en-US', 'en-GB'];

      for (const code of regionalCodes) {
        await expect(
          useCase.execute({
            userId: mockUser.id,
            language: code,
          })
        ).rejects.toThrow(ValidationError);
      }
    });

    it('NO debería retornar nada (void)', async () => {
      // Arrange
      const mockUser = UserFactory.create({ language: 'en' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        language: 'es',
      });

      // Assert
      expect(result).toBeUndefined();
    });

    it('debería funcionar para usuarios inactivos', async () => {
      // Arrange
      const mockUser = UserFactory.createInactive({ language: 'en' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: mockUser.id,
          language: 'es',
        })
      ).resolves.not.toThrow();
    });
  });
});
