import { NotFoundError } from '@shared/errors';
import { User, UserProps } from '@features/auth/domain/entities/user.entity';
import { UpdateProfileUseCase } from './update-profile.use-case';
import {
  MockUserRepository,
  createMockUserRepository,
} from '@shared/testing/mock.types';

// Helper para crear UserProps con todos los campos requeridos
const createUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 'user-123',
  username: 'juan',
  passwordHash: '$2b$12$hashed',
  name: 'Juan Old',
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
      const mockUser = User.reconstruct(createUserProps());

      const updatedUser = User.reconstruct(createUserProps({ name: 'Juan Updated' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        name: 'Juan Updated',
      });

      // Assert
      expect(result.id).toBe('user-123');
      expect(result.username).toBe('juan');
      expect(result.name).toBe('Juan Updated');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updatePartial).toHaveBeenCalledWith('user-123', {
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
      const mockUser = User.reconstruct(createUserProps({ passwordHash: '$2b$12$super_secret_hash' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
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
      const mockUser = User.reconstruct(createUserProps());

      const updatedUser = User.reconstruct(createUserProps({ name: 'Juan Updated' }));

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updatePartial.mockResolvedValue(updatedUser);

      // Act
      const result = await useCase.execute({
        userId: 'user-123',
        name: 'Juan Updated',
      });

      // Assert
      expect(result.username).toBe('juan');
    });
  });
});
