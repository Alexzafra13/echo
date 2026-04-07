import { Injectable, Inject } from '@nestjs/common';
import { UnauthorizedError } from '@shared/errors';
import { DateUtil } from '@shared/utils/date.util';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import {
  USER_REPOSITORY,
  IUserRepository,
  PASSWORD_SERVICE,
  IPasswordService,
  TOKEN_SERVICE,
  ITokenService,
} from '../../ports';
import { LoginInput, LoginOutput } from './login.dto';

// Hash dummy para ejecutar bcrypt incluso cuando el usuario no existe,
// evitando que la diferencia de tiempo de respuesta revele si un username es válido.
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lz0qVpJGOuO2/.ZFMHawJIFjn5eM5MzEbnyPgBKMqdmPe';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: IPasswordService,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    private readonly logService: LogService
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepo.findByUsername(input.username);
    if (!user) {
      // Ejecutar bcrypt para igualar el tiempo de respuesta (timing attack)
      await this.passwordService.compare(input.password, DUMMY_HASH);
      await this.logService.warning(
        LogCategory.AUTH,
        `Failed login attempt - user not found: ${input.username}`,
        { username: input.username }
      );
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      await this.logService.warning(
        LogCategory.AUTH,
        `Failed login attempt - inactive account: ${input.username}`,
        { username: input.username, userId: user.id }
      );
      throw new UnauthorizedError('Account is inactive');
    }

    const isValid = await this.passwordService.compare(input.password, user.passwordHash);
    if (!isValid) {
      await this.logService.warning(
        LogCategory.AUTH,
        `Failed login attempt - invalid password: ${input.username}`,
        { username: input.username, userId: user.id }
      );
      throw new UnauthorizedError('Invalid credentials');
    }

    const now = DateUtil.now();
    await this.userRepo.updatePartial(user.id, {
      lastLoginAt: now,
      lastAccessAt: now,
    });

    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);

    await this.logService.info(LogCategory.AUTH, `Successful login: ${user.username}`, {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        isAdmin: user.isAdmin,
        avatarPath: user.avatarPath,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
