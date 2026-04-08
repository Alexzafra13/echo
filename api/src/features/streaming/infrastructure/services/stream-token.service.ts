import { Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { streamTokens, users } from '@infrastructure/database/schema';
import { randomBytes, createHash } from 'crypto';

// Expiración de tokens de streaming (contexto self-hosted, un token por usuario)
const STREAM_TOKEN_EXPIRY_HOURS = 24;

@Injectable()
export class StreamTokenService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cache: RedisService
  ) {}

  async generateToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + STREAM_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidar cache del token anterior antes de borrarlo
    await this.invalidateCacheForUser(userId);

    await this.drizzle.db.delete(streamTokens).where(eq(streamTokens.userId, userId));

    // Almacenar hash del token en DB (el token plano solo lo tiene el cliente)
    await this.drizzle.db.insert(streamTokens).values({
      userId,
      token: tokenHash,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async validateToken(token: string): Promise<string | null> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `stream-token:${tokenHash}`;

    // 1. Check cache first
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return cached;

    // 2. DB query por hash (cache miss)
    const result = await this.drizzle.db
      .select({
        token: streamTokens,
        user: users,
      })
      .from(streamTokens)
      .leftJoin(users, eq(streamTokens.userId, users.id))
      .where(eq(streamTokens.token, tokenHash))
      .limit(1);

    const streamToken = result[0];

    if (!streamToken || !streamToken.user) {
      return null;
    }

    if (streamToken.token.expiresAt < new Date()) {
      await this.drizzle.db.delete(streamTokens).where(eq(streamTokens.id, streamToken.token.id));
      return null;
    }

    if (!streamToken.user.isActive) {
      return null;
    }

    // Cache 1h — el token expira a las 24h, no tiene sentido consultar DB cada 5min
    await this.cache.set(cacheKey, streamToken.token.userId, 3600);

    // 4. Update lastUsedAt fire-and-forget (not critical)
    this.drizzle.db
      .update(streamTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(streamTokens.id, streamToken.token.id))
      .catch(() => {});

    return streamToken.token.userId;
  }

  // El token almacenado en DB es un hash — no se puede devolver al cliente.
  // Retorna null para que el controller genere uno nuevo.
  async getUserToken(_userId: string): Promise<{ token: string; expiresAt: Date } | null> {
    return null;
  }

  async revokeToken(userId: string): Promise<void> {
    // Invalidar cache específica del usuario antes de borrar de DB
    await this.invalidateCacheForUser(userId);
    await this.drizzle.db.delete(streamTokens).where(eq(streamTokens.userId, userId));
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.drizzle.db
      .delete(streamTokens)
      .where(lt(streamTokens.expiresAt, new Date()))
      .returning();

    return result.length;
  }

  /**
   * Invalida la cache Redis del stream token de un usuario específico.
   * Busca el hash almacenado en DB para derivar la clave exacta de cache,
   * evitando delPattern('stream-token:*') que invalida cache de todos los usuarios.
   */
  private async invalidateCacheForUser(userId: string): Promise<void> {
    const existing = await this.drizzle.db
      .select({ token: streamTokens.token })
      .from(streamTokens)
      .where(eq(streamTokens.userId, userId))
      .limit(1);

    if (existing[0]) {
      // El token en DB ya es un hash, úsalo directamente como clave de cache
      await this.cache.del(`stream-token:${existing[0].token}`);
    }
  }

  /**
   * SHA-256 completo del token. Se usa como:
   * 1. Valor almacenado en DB (en vez del token plano)
   * 2. Clave de cache en Redis
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
