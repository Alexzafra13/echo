import { Injectable, Inject } from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
} from '@features/auth/domain/ports';
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

    // 7. Retornar credenciales
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
}