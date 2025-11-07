import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '@features/auth/domain/ports';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors';
import { UpdateUserInput, UpdateUserOutput } from './update-user.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Si se está actualizando el email, verificar que no exista
    if (input.email !== undefined && input.email !== user.email) {
      const existingUserByEmail = await this.userRepository.findByEmail(
        input.email,
      );
      if (existingUserByEmail && existingUserByEmail.id !== user.id) {
        throw new ConflictError('Email already exists');
      }
    }

    // 3. Validar email si se proporciona
    if (input.email !== undefined && input.email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email)) {
        throw new ValidationError('Invalid email format');
      }
    }

    // 4. Preparar datos de actualización
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.isAdmin !== undefined) updateData.isAdmin = input.isAdmin;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    // 5. Actualizar usuario
    const updatedUser = await this.userRepository.updatePartial(
      input.userId,
      updateData,
    );

    // 6. Retornar usuario actualizado
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
      isAdmin: updatedUser.isAdmin,
      isActive: updatedUser.isActive,
    };
  }
}
