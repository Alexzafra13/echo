import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './presentation/auth.controller';
import {
  LoginUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
} from './domain/use-cases';
import { DrizzleUserRepository } from './infrastructure/persistence/user.repository';
import { JwtAdapter } from './infrastructure/adapters/jwt.adapter';
import { BcryptAdapter } from './infrastructure/adapters/bcrypt.adapter';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { TokenBlacklistService } from './infrastructure/services/token-blacklist.service';
import { USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_SERVICE } from './domain/ports';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { LogsModule } from '@features/logs/logs.module';
import { CacheModule } from '@infrastructure/cache/cache.module';

@Module({
  imports: [
    PassportModule,
    LogsModule,
    CacheModule,
    // Use registerAsync to get secret from SecuritySecretsService
    // Secrets are auto-generated on first run (like Navidrome/Jellyfin)
    JwtModule.registerAsync({
      useFactory: async (secretsService: SecuritySecretsService): Promise<JwtModuleOptions> => {
        // Ensure secrets are initialized before using them
        await secretsService.initializeSecrets();
        return {
          secret: secretsService.jwtSecret,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRATION || '24h') as '24h',
          },
        };
      },
      inject: [SecuritySecretsService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Use Cases
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,

    // Services
    TokenBlacklistService,

    // Repository
    DrizzleUserRepository,

    // Repository implementation
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },

    // Service implementations
    {
      provide: TOKEN_SERVICE,
      useClass: JwtAdapter,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: BcryptAdapter,
    },

    // Passport strategy
    JwtStrategy,
  ],
  exports: [USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_SERVICE],
})
export class AuthModule {}
