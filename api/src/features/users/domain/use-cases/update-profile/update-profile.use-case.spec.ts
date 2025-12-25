import { NotFoundError } from '@shared/errors';
import { UpdateProfileUseCase } from './update-profile.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
} from '@shared/testing/mock.types';
import { UserFactory } from '../../../../../../test/factories/user.factory';

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
  let mockUserRepository: MockUserRepository;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();

    useCase = new UpdateProfileUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('debería actualizar nombre correctamente', async () => {
      // Arrange
      const mockUser = UserFactory.create({ name: 'Juan Old' });
      const updatedUser = UserFactory.create({ name: 'Juan Updated' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        name: 'Juan Updated',
      });

      // Assert
      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect(result.name).toBe('Juan Updated');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith(mockUser.id, {
        name: 'Juan Updated',
      });
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          userId: 'invalid-id',
          name: 'New Name',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('NO debería incluir campos sensibles en la respuesta', async () => {
      // Arrange
      const mockUser = UserFactory.create({
        passwordHash: '$2b$12$super_secret_hash',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        name: 'Juan Updated',
      });

      // Assert
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('isAdmin');
      expect(JSON.stringify(result)).not.toContain('super_secret_hash');
    });

    it('debería preservar username (no debe cambiar)', async () => {
      // Arrange
      const mockUser = UserFactory.create({ username: 'juan', name: 'Juan' });
      const updatedUser = UserFactory.create({ username: 'juan', name: 'Juan Updated' });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: mockUser.id,
        name: 'Juan Updated',
      });

      // Assert
      expect(result.username).toBe('juan');
    });
  });
});
