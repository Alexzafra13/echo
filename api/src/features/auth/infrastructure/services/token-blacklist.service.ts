import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';

// Blacklist de tokens JWT en Redis. Permite invalidar tokens al hacer logout.
// Los tokens se auto-eliminan de Redis al expirar (TTL).
@Injectable()
export class TokenBlacklistService {
  private readonly PREFIX = 'token:blacklist:';

  constructor(
    @InjectPinoLogger(TokenBlacklistService.name)
    private readonly logger: PinoLogger,
    private readonly redis: RedisService,
  ) {}

  async add(tokenOrJti: string, expiresAt: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresAt - now;

    if (ttl <= 0) {
      this.logger.debug('Token already expired, skipping blacklist');
      return;
    }

    const key = this.getKey(tokenOrJti);

    await this.redis.set(key, { invalidatedAt: now }, ttl);

    this.logger.debug({ ttl }, 'Token added to blacklist');
  }

  async isBlacklisted(tokenOrJti: string): Promise<boolean> {
    const key = this.getKey(tokenOrJti);
    const result = await this.redis.get(key);
    return result !== null;
  }

  // SHA-256 del token completo para evitar colisiones
  private getKey(tokenOrJti: string): string {
    const hash = createHash('sha256').update(tokenOrJti).digest('hex');
    return `${this.PREFIX}${hash}`;
  }
}
