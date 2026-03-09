import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Socket } from 'socket.io';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users } from '@infrastructure/database/schema';
import { eq } from 'drizzle-orm';

/**
 * WsJwtGuard - Guard de autenticación JWT para WebSocket
 *
 * Responsabilidades:
 * - Validar token JWT en handshake de WebSocket
 * - Buscar usuario en BD para obtener datos completos (isAdmin, isActive)
 * - Adjuntar usuario al socket
 * - Rechazar conexiones sin token válido o de usuarios inactivos
 *
 * El token se puede enviar de 3 formas:
 * 1. Query param: ?token=xxx
 * 2. Auth header: Authorization: Bearer xxx
 * 3. Handshake auth: { auth: { token: 'xxx' } }
 *
 * Uso:
 * @UseGuards(WsJwtGuard)
 * @WebSocketGateway()
 * export class MyGateway { }
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    @InjectPinoLogger(WsJwtGuard.name)
    private readonly logger: PinoLogger,
    private jwtService: JwtService,
    private secretsService: SecuritySecretsService,
    private drizzle: DrizzleService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('No token provided');
      }

      // Verificar token usando el servicio de secretos centralizado
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.secretsService.jwtSecret,
      });

      // Verificar que el usuario no tenga pendiente un cambio de contraseña
      if (payload.mustChangePassword) {
        throw new WsException('Password change required before using WebSocket features');
      }

      // Buscar usuario en BD para obtener isAdmin y isActive
      // Usa DrizzleService directamente (global) para evitar dependencia con AuthModule
      const userRows = await this.drizzle.db
        .select({
          id: users.id,
          isAdmin: users.isAdmin,
          isActive: users.isActive,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      const user = userRows[0];
      if (!user || !user.isActive) {
        throw new WsException('Unauthorized');
      }

      // Adjuntar usuario completo al socket (incluye isAdmin de BD)
      client.data.user = {
        ...payload,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        name: user.name,
      };
      client.data.userId = payload.sub;

      this.logger.debug(`User ${payload.sub} authenticated via WebSocket`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`WebSocket authentication failed: ${errorMessage}`);
      // Si ya es una WsException, relanzarla directamente
      if (error instanceof WsException) {
        throw error;
      }
      // Para otros errores, lanzar con mensaje genérico
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
