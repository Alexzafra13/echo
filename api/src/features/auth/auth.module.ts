import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './presentation/auth.controller';
import { LoginUseCase, RefreshTokenUseCase, LogoutUseCase } from './domain/use-cases';
import { DrizzleUserRepository } from './infrastructure/persistence/user.repository';
import { JwtAdapter } from './infrastructure/adapters/jwt.adapter';
import { BcryptAdapter } from './infrastructure/adapters/bcrypt.adapter';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { TokenBlacklistService } from './infrastructure/services/token-blacklist.service';
import {
  USER_REPOSITORY,
  TOKEN_SERVICE,
  PASSWORD_SERVICE,
  TOKEN_BLACKLIST_SERVICE,
} from './domain/ports';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { LogsModule } from '@features/logs/logs.module';
import { CacheModule } from '@infrastructure/cache/cache.module';
// Registrado como provider directo (no import de StreamingModule) para evitar
// la cadena circular: AuthModule → StreamingModule → TracksModule → ... → AlbumsModule → TracksModule.
// StreamTokenService es stateless (DB+Redis), así que funciona sin compartir instancia.
import { StreamTokenService } from '@features/streaming/infrastructure/services/stream-token.service';

@Module({
  imports: [
    PassportModule,
    LogsModule,
    CacheModule,
    JwtModule.registerAsync({
      useFactory: async (secretsService: SecuritySecretsService): Promise<JwtModuleOptions> => {
        await secretsService.initializeSecrets();
        return {
          secret: secretsService.jwtSecret,
          signOptions: {
            expiresIn: '24h',
          },
        };
      },
      inject: [SecuritySecretsService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,

    TokenBlacklistService,

    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },

    {
      provide: TOKEN_SERVICE,
      useClass: JwtAdapter,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: BcryptAdapter,
    },
    {
      provide: TOKEN_BLACKLIST_SERVICE,
      useClass: TokenBlacklistService,
    },

    JwtStrategy,
    StreamTokenService,
  ],
  exports: [USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_SERVICE],
})
export class AuthModule {}
