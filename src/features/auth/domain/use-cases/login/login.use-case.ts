// src/features/auth/domain/use-cases/login/login.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { UnauthorizedError, ValidationError } from '@shared/errors';
import { DateUtil } from '@shared/utils/date.util';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
  TOKEN_SERVICE,
  ITokenService,
} from '../../ports';
import { LoginInput, LoginOutput } from './login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Validaciones
    if (!input.username || !input.password) {
      throw new ValidationError('Username and password are required');
    }

    // 2. Buscar usuario
    const user = await this.userRepo.findByUsername(input.username);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 3. Verificar contraseña
    const isValid = await this.passwordService.compare(
      input.password,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 4. Actualizar fechas de acceso
    const now = DateUtil.now();
    await this.userRepo.updatePartial(user.id, {
      lastLoginAt: now,
      lastAccessAt: now,
    });

    // 5. Generar tokens
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

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