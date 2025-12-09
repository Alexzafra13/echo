import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
} from '@features/auth/domain/ports';
import { ISocialRepository, SOCIAL_REPOSITORY } from '@features/social/domain/ports';
import { User } from '@features/auth/domain/entities/user.entity';
import { ConflictError, ValidationError } from '@shared/errors';
import { PasswordUtil } from '@shared/utils/password.util';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { CreateUserInput, CreateUserOutput } from './create-user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
    @Inject(SOCIAL_REPOSITORY)
    private readonly socialRepository: ISocialRepository,
    private readonly logService: LogService,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    // 1. Validar entrada
    if (!input.username || input.username.length < 3) {
      throw new ValidationError('Username must be at least 3 characters');
    }

    // 2. Verificar que username no exista
    const existingUserByUsername = await this.userRepository.findByUsername(
      input.username,
    );
    if (existingUserByUsername) {
      throw new ConflictError('Username already exists');
    }

    // 3. Generar contraseña temporal de 6 dígitos
    const temporaryPassword = PasswordUtil.generateTemporaryPassword();
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    // 4. Crear usuario
    const user = User.create({
      username: input.username,
      passwordHash,
      name: input.name,
      isActive: true,
      isAdmin: input.isAdmin || false,
      mustChangePassword: true, // DEBE cambiar en primer login
    });

    // 5. Persistir
    const savedUser = await this.userRepository.create(user);

    // 6. Log user creation
    await this.logService.info(
      LogCategory.AUTH,
      `User created by admin: ${savedUser.username}`,
      {
        userId: savedUser.id,
        username: savedUser.username,
        isAdmin: savedUser.isAdmin,
        createdBy: input.adminId,
      },
    );

    // 7. Auto-friend with system admin if created by system admin
    if (input.adminId) {
      await this.autoFriendWithSystemAdmin(input.adminId, savedUser.id);
    }

    // 8. Retornar credenciales
    return {
      user: {
        id: savedUser.id,
        username: savedUser.username,
        name: savedUser.name,
        isAdmin: savedUser.isAdmin,
      },
      temporaryPassword, // Admin debe enviar esto al usuario
    };
  }

  /**
   * Auto-friend new user with system admin if created by system admin.
   * The system admin is the oldest admin user (first admin created).
   */
  private async autoFriendWithSystemAdmin(creatorAdminId: string, newUserId: string): Promise<void> {
    try {
      // Get all users to find the system admin (oldest admin)
      const allUsers = await this.userRepository.findAll(0, 1000);
      const adminUsers = allUsers.filter(u => u.isAdmin);

      if (adminUsers.length === 0) return;

      // System admin is the oldest admin by createdAt
      const systemAdmin = adminUsers.reduce((oldest, current) =>
        current.createdAt < oldest.createdAt ? current : oldest
      );

      // Only auto-friend if the creator is the system admin
      if (creatorAdminId !== systemAdmin.id) return;

      // Create accepted friendship between system admin and new user
      await this.socialRepository.createAcceptedFriendship(systemAdmin.id, newUserId);

      this.logService.info(
        LogCategory.AUTH,
        `Auto-friended new user ${newUserId} with system admin`,
        { systemAdminId: systemAdmin.id, newUserId },
      );
    } catch (error) {
      // Don't fail user creation if auto-friend fails
      this.logService.warning(
        LogCategory.AUTH,
        `Failed to auto-friend new user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { newUserId, creatorAdminId },
      );
    }
  }
}