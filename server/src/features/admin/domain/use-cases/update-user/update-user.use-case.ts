import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  UserUpdateableFields,
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

    // 2. Verificar si es el system admin (primer admin creado)
    const allUsers = await this.userRepository.findAll(0, 1000);
    const adminUsers = allUsers.filter(u => u.isAdmin);
    const systemAdmin = adminUsers.length > 0
      ? adminUsers.reduce((oldest, current) =>
          current.createdAt < oldest.createdAt ? current : oldest
        )
      : null;

    const isSystemAdmin = systemAdmin ? user.id === systemAdmin.id : false;

    // 3. Si es system admin, no permitir cambios en isAdmin ni isActive
    if (isSystemAdmin) {
      if (input.isAdmin !== undefined && input.isAdmin !== user.isAdmin) {
        throw new ValidationError('Cannot modify admin status of system administrator');
      }
      if (input.isActive !== undefined && input.isActive !== user.isActive) {
        throw new ValidationError('Cannot modify active status of system administrator');
      }
    }

    // 4. Si se está actualizando el username, verificar que no exista
    if (input.username !== undefined && input.username !== user.username) {
      if (!input.username || input.username.trim().length === 0) {
        throw new ValidationError('Username cannot be empty');
      }
      const existingUserByUsername = await this.userRepository.findByUsername(
        input.username,
      );
      if (existingUserByUsername && existingUserByUsername.id !== user.id) {
        throw new ConflictError('Username already exists');
      }
    }

    // 5. Si se está actualizando el email, verificar que no exista
    if (input.email !== undefined && input.email !== user.email) {
      const existingUserByEmail = await this.userRepository.findByEmail(
        input.email,
      );
      if (existingUserByEmail && existingUserByEmail.id !== user.id) {
        throw new ConflictError('Email already exists');
      }
    }

    // 6. Validar email si se proporciona
    if (input.email !== undefined && input.email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email)) {
        throw new ValidationError('Invalid email format');
      }
    }

    // 7. Preparar datos de actualización
    const updateData: Partial<UserUpdateableFields> = {};
    if (input.username !== undefined) updateData.username = input.username;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.isAdmin !== undefined) updateData.isAdmin = input.isAdmin;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    // 8. Actualizar usuario
    const updatedUser = await this.userRepository.updatePartial(
      input.userId,
      updateData,
    );

    // 9. Retornar usuario actualizado
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
