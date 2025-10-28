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
import { CreateUserInput, CreateUserOutput } from './create-user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
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

    // 3. Verificar que email no exista (si se proporciona)
    if (input.email) {
      const existingUserByEmail = await this.userRepository.findByEmail(
        input.email,
      );
      if (existingUserByEmail) {
        throw new ConflictError('Email already exists');
      }
    }

    // 4. Generar contraseña temporal de 6 dígitos
    const temporaryPassword = PasswordUtil.generateTemporaryPassword();
    const passwordHash = await this.passwordService.hash(temporaryPassword);

    // 5. Crear usuario
    const user = User.create({
      username: input.username,
      email: input.email,
      passwordHash,
      name: input.name,
      isActive: true,
      isAdmin: input.isAdmin || false,
      mustChangePassword: true, // DEBE cambiar en primer login
    });

    // 6. Persistir
    const savedUser = await this.userRepository.create(user);

    // 7. Retornar credenciales
    return {
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        name: savedUser.name,
        isAdmin: savedUser.isAdmin,
      },
      temporaryPassword, // Admin debe enviar esto al usuario
    };
  }
}