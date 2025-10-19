import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../ports/user-repository.port';
import { NotFoundError, ValidationError, ConflictError } from '@shared/errors';
import { UpdateProfileInput, UpdateProfileOutput } from './update-profile.dto';

/**
 * UpdateProfileUseCase - Actualiza el perfil de un usuario
 * 
 * Responsabilidad:
 * - Validar datos del perfil
 * - Verificar que email no esté en uso (si se cambia)
 * - Actualizar perfil
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    // 1. Verificar que usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // 2. Si se cambia el email, verificar que no esté en uso
    if (input.email && input.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(input.email);
      if (existingUser) {
        throw new ConflictError('Email already in use');
      }
    }

    // 3. Actualizar perfil
    const updatedUser = await this.userRepository.updatePartial(input.userId, {
      name: input.name,
      email: input.email,
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
    };
  }
}