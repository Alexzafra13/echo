import { Module, Global } from '@nestjs/common';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';

import { WsJwtGuard } from './guards/ws-jwt.guard';
import { WsThrottlerGuard } from './guards/ws-throttler.guard';
import { WsExceptionFilter } from './filters/ws-exception.filter';
import { WsLoggingInterceptor } from './interceptors/ws-logging.interceptor';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { USER_REPOSITORY } from '@features/auth/domain/ports';
import { DrizzleUserRepository } from '@features/auth/infrastructure/persistence/user.repository';
// Registrado como provider directo (no import de AuthModule) para evitar dependencia circular.
// TokenBlacklistService es stateless (Redis), así que funciona sin compartir instancia.
import { TokenBlacklistService } from '@features/auth/infrastructure/services/token-blacklist.service';

type ExpiresIn = JwtSignOptions['expiresIn'];

/**
 * WebSocketModule - Módulo global de infraestructura WebSocket
 *
 * Provee guards (JWT, throttling), filters y logging para gateways.
 * Es @Global() para que los gateways lo tengan disponible sin importarlo.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (secretsService: SecuritySecretsService): Promise<JwtModuleOptions> => {
        await secretsService.initializeSecrets();
        return {
          secret: secretsService.jwtSecret,
          signOptions: {
            expiresIn: '24h' as ExpiresIn,
          },
        };
      },
      inject: [SecuritySecretsService],
    }),
  ],
  providers: [
    WsJwtGuard,
    WsThrottlerGuard,
    WsExceptionFilter,
    WsLoggingInterceptor,
    {
      provide: USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
    TokenBlacklistService,
  ],
  exports: [
    WsJwtGuard,
    WsThrottlerGuard,
    WsExceptionFilter,
    WsLoggingInterceptor,
    JwtModule,
    // Exportar para que los guards puedan resolver sus dependencias
    // en el contexto de módulos consumidores (ej: ScannerModule)
    USER_REPOSITORY,
    TokenBlacklistService,
  ],
})
export class WebSocketModule {}
