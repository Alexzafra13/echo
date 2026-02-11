import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';

/**
 * TokenBlacklistService - Gestiona tokens JWT invalidados (logout)
 *
 * Cuando un usuario hace logout, su token se agrega a una blacklist en Redis.
 * Los tokens permanecen en la blacklist hasta que expiran naturalmente.
 *
 * Esto permite invalidar tokens antes de su expiración natural,
 * resolviendo el problema de que los tokens JWT son stateless.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly PREFIX = 'token:blacklist:';

  constructor(
    @InjectPinoLogger(TokenBlacklistService.name)
    private readonly logger: PinoLogger,
    private readonly redis: RedisService,
  ) {}

  /**
   * Agrega un token a la blacklist
   * @param token - El token JWT completo o su JTI (JWT ID)
   * @param expiresAt - Timestamp de expiración del token (para auto-limpieza)
   */
  async add(tokenOrJti: string, expiresAt: number): Promise<void> {
    // Calcular TTL: tiempo restante hasta que el token expire
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresAt - now;

    // Si el token ya expiró, no hay necesidad de blacklistearlo
    if (ttl <= 0) {
      this.logger.debug('Token already expired, skipping blacklist');
      return;
    }

    // Usar hash del token como clave para ahorrar memoria
    const key = this.getKey(tokenOrJti);

    await this.redis.set(key, { invalidatedAt: now }, ttl);

    this.logger.debug({ ttl }, 'Token added to blacklist');
  }

  /**
   * Verifica si un token está en la blacklist
   * @param tokenOrJti - El token JWT completo o su JTI
   * @returns true si el token está blacklisteado (inválido)
   */
  async isBlacklisted(tokenOrJti: string): Promise<boolean> {
    const key = this.getKey(tokenOrJti);
    const result = await this.redis.get(key);
    return result !== null;
  }

  /**
   * Genera la clave de Redis para un token.
   * Usa SHA-256 del token completo para evitar colisiones.
   */
  private getKey(tokenOrJti: string): string {
    const hash = createHash('sha256').update(tokenOrJti).digest('hex');
    return `${this.PREFIX}${hash}`;
  }
}
