import { Injectable, Inject } from '@nestjs/common';
import { UnauthorizedError } from '@shared/errors';
import { IUserRepository, USER_REPOSITORY } from '../../ports/user-repository.port';
import { ITokenService, TOKEN_SERVICE } from '../../ports/token-service.port';
import { IPasswordService, PASSWORD_SERVICE } from '../../ports/password-service.port';
import { LoginInput, LoginOutput } from './login.dto';

/**
 * LoginUseCase - Lógica de login
 *
 * Proceso:
 * 1. Validar que username y password existen
 * 2. Buscar usuario por username
 * 3. Verificar que está activo
 * 4. Comparar contraseña con hash
 * 5. Generar tokens
 * 6. Retornar usuario y tokens
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Validar entrada
    if (!input.username || !input.password) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findByUsername(input.username);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 3. Verificar contraseña
    const isPasswordValid = await this.passwordService.compare(
      input.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 4. Generar tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    // 5. Retornar
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    };
  }
}