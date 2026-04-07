import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Socket } from 'socket.io';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports';
import { TokenBlacklistService } from '@features/auth/infrastructure/services/token-blacklist.service';

/**
 * WsJwtGuard - Guard de autenticación JWT para WebSocket
 *
 * El token se puede enviar de 3 formas:
 * 1. Query param: ?token=xxx
 * 2. Handshake auth: { auth: { token: 'xxx' } }
 * 3. Authorization header: Bearer xxx
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(WsJwtGuard.name)
    private readonly logger: PinoLogger,
    private jwtService: JwtService,
    private secretsService: SecuritySecretsService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly tokenBlacklist: TokenBlacklistService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();

      // Si el usuario ya fue verificado y enriquecido con datos de BD,
      // no re-verificar en cada evento (solo se verifica en el primer evento tras conexión)
      if (client.data.user?.isAdmin !== undefined && client.data.user?.isActive !== undefined) {
        return true;
      }

      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.secretsService.jwtSecret,
      });

      // Verificar que el token no haya sido revocado (logout)
      if (payload.jti && (await this.tokenBlacklist.isBlacklisted(payload.jti))) {
        throw new WsException('Token revoked');
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new WsException('Unauthorized');
      }

      client.data.user = {
        ...payload,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        name: user.name,
      };
      client.data.userId = payload.userId;

      this.logger.debug(`User ${payload.userId} authenticated via WebSocket`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`WebSocket authentication failed: ${errorMessage}`);
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Unauthorized');
    }
  }

  /**
   * Extrae token JWT del handshake
   * Soporta múltiples métodos de envío
   */
  private extractToken(client: Socket): string | undefined {
    // 1. Desde query params: ?token=xxx
    if (client.handshake.query?.token) {
      return Array.isArray(client.handshake.query.token)
        ? client.handshake.query.token[0]
        : client.handshake.query.token;
    }

    // 2. Desde auth object: socket.connect({ auth: { token: 'xxx' } })
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 3. Desde Authorization header: Bearer xxx
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
