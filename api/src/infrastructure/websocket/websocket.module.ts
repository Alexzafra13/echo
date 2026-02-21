import { Module, Global } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { WsJwtGuard } from './guards/ws-jwt.guard';
import { WsThrottlerGuard } from './guards/ws-throttler.guard';
import { WsExceptionFilter } from './filters/ws-exception.filter';
import { WsLoggingInterceptor } from './interceptors/ws-logging.interceptor';

type ExpiresIn = JwtSignOptions['expiresIn'];

/**
 * WebSocketModule - Módulo global de infraestructura WebSocket
 *
 * Responsabilidades:
 * - Proveer guards, filters e interceptors para WebSocket
 * - Configurar JWT para autenticación WebSocket
 * - Exportar utilidades para uso en otros módulos
 *
 * Este módulo es @Global() para que los gateways lo tengan disponible
 * sin necesidad de importarlo explícitamente
 *
 * Providers exportados:
 * - WsJwtGuard: Autenticación JWT
 * - WsThrottlerGuard: Rate limiting
 * - WsExceptionFilter: Manejo de errores
 * - WsLoggingInterceptor: Logging de eventos
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '24h') as ExpiresIn,
        },
      }),
    }),
  ],
  providers: [WsJwtGuard, WsThrottlerGuard, WsExceptionFilter, WsLoggingInterceptor],
  exports: [WsJwtGuard, WsThrottlerGuard, WsExceptionFilter, WsLoggingInterceptor, JwtModule],
})
export class WebSocketModule {}
