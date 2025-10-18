import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { User } from '../../entities/user.entity';
import { Email, Username, Password } from '../../value-objects';
import { IUserRepository, USER_REPOSITORY } from '../../ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE } from '../../ports/token-service.port';
import { IPasswordService, PASSWORD_SERVICE } from '../../ports/password-service.port';
import { RegisterUserInput, RegisterUserOutput } from './register-user.dto';

/**
 * RegisterUserUseCase - Lógica de registro
 *
 * Proceso:
 * 1. Validar entrada con Value Objects (Email, Username, Password)
 * 2. Verificar que username no existe
 * 3. Verificar que email no existe (solo si se proporciona)
 * 4. Hashear contraseña
 * 5. Crear usuario
 * 6. Guardar en BD
 * 7. Generar tokens
 * 8. Retornar usuario y tokens
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // 1. Validar entrada con Value Objects
    const username = new Username(input.username);
    const password = new Password(input.password);
    
    // Email es opcional - solo validar si se proporciona
    const email = input.email ? new Email(input.email) : null;

    // 2. Verificar que username no existe
    const existingUser = await this.userRepository.findByUsername(username.getValue());
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // 3. Verificar que email no existe (solo si se proporcionó)
    if (email) {
      const existingEmail = await this.userRepository.findByEmail(email.getValue());
      if (existingEmail) {
        throw new ValidationError('Email already registered');
      }
    }

    // 4. Hashear contraseña
    const passwordHash = await this.passwordService.hash(password.getValue());

    // 5. Crear usuario
    const user = User.create({
      username: username.getValue(),
      email: email?.getValue(),
      passwordHash,
      name: input.name,
      isActive: true,
      isAdmin: false,
    });

    // 6. Guardar en BD
    const savedUser = await this.userRepository.create(user);

    // 7. Generar tokens
    const accessToken = await this.tokenService.generateAccessToken(savedUser);
    const refreshToken = await this.tokenService.generateRefreshToken(savedUser);

    // 8. Retornar
    return {
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        name: savedUser.name,
      },
      accessToken,
      refreshToken,
    };
  }
}