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
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verificar si es el system admin (primer admin creado)
    const allUsers = await this.userRepository.findAll(0, 1000);
    const adminUsers = allUsers.filter(u => u.isAdmin);
    const systemAdmin = adminUsers.length > 0
      ? adminUsers.reduce((oldest, current) =>
          current.createdAt < oldest.createdAt ? current : oldest
        )
      : null;

    const isSystemAdmin = systemAdmin ? user.id === systemAdmin.id : false;

    if (isSystemAdmin) {
      if (input.isAdmin !== undefined && input.isAdmin !== user.isAdmin) {
        throw new ValidationError('Cannot modify admin status of system administrator');
      }
      if (input.isActive !== undefined && input.isActive !== user.isActive) {
        throw new ValidationError('Cannot modify active status of system administrator');
      }
    }

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

    const updateData: Partial<UserUpdateableFields> = {};
    if (input.username !== undefined) updateData.username = input.username;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.isAdmin !== undefined) updateData.isAdmin = input.isAdmin;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updatedUser = await this.userRepository.updatePartial(
      input.userId,
      updateData,
    );

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      isAdmin: updatedUser.isAdmin,
      isActive: updatedUser.isActive,
    };
  }
}
