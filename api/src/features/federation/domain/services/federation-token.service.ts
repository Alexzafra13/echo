import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../ports/federation.repository';
import {
  FederationToken,
  FederationAccessToken,
  FederationPermissions,
  MutualFederationStatus,
} from '../types';

@Injectable()
export class FederationTokenService implements OnModuleDestroy {
  // In-memory cache for validated access tokens (5 min TTL)
  // Using in-memory instead of Redis to respect domain layer boundaries
  private validatedTokens = new Map<string, { result: FederationAccessToken; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 500;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository
  ) {
    // Periodic cleanup of expired entries
    this.cleanupTimer = setInterval(() => this.evictExpired(), this.CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.validatedTokens.entries()) {
      if (value.expiresAt <= now) {
        this.validatedTokens.delete(key);
      }
    }
  }

  async generateInvitationToken(
    userId: string,
    name?: string,
    expiresInDays = 7,
    maxUses = 1
  ): Promise<FederationToken> {
    const rawToken = randomBytes(8).toString('hex').toUpperCase();
    const token = `${rawToken.slice(0, 4)}-${rawToken.slice(4, 8)}-${rawToken.slice(8, 12)}-${rawToken.slice(12, 16)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    return this.repository.createFederationToken({
      createdByUserId: userId,
      token,
      name,
      expiresAt,
      maxUses,
    });
  }

  async validateInvitationToken(token: string): Promise<FederationToken | null> {
    const federationToken = await this.repository.findFederationTokenByToken(token);

    if (!federationToken) {
      return null;
    }

    if (federationToken.expiresAt < new Date()) {
      return null;
    }

    if (federationToken.currentUses >= federationToken.maxUses) {
      return null;
    }

    return federationToken;
  }

  async useInvitationToken(
    token: string,
    serverName: string,
    serverUrl?: string,
    ip?: string,
    mutualInvitationToken?: string
  ): Promise<FederationAccessToken | null> {
    const federationToken = await this.repository.useInvitationTokenAtomic(token, serverName, ip);

    if (!federationToken) {
      return null;
    }

    const accessToken = randomBytes(32).toString('hex');
    const mutualStatus: MutualFederationStatus = mutualInvitationToken ? 'pending' : 'none';

    return this.repository.createFederationAccessToken({
      ownerId: federationToken.createdByUserId,
      token: accessToken,
      serverName,
      serverUrl,
      permissions: {
        canBrowse: true,
        canStream: true,
        canDownload: false,
      },
      mutualInvitationToken: mutualInvitationToken ?? null,
      mutualStatus,
    });
  }

  async validateAccessToken(token: string): Promise<FederationAccessToken | null> {
    // 1. Check in-memory cache
    const cached = this.validatedTokens.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      // Fire-and-forget lastUsedAt update
      this.repository
        .updateFederationAccessToken(cached.result.id, { lastUsedAt: new Date() })
        .catch(() => {});
      return cached.result;
    }

    // Cleanup expired entry if present
    if (cached) {
      this.validatedTokens.delete(token);
    }

    // 2. DB query (cache miss)
    const accessToken = await this.repository.findFederationAccessTokenByToken(token);

    if (!accessToken || !accessToken.isActive) {
      return null;
    }

    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      return null;
    }

    // 3. Cache the result (evict oldest if at capacity)
    if (this.validatedTokens.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.validatedTokens.keys().next().value;
      if (firstKey) this.validatedTokens.delete(firstKey);
    }
    this.validatedTokens.set(token, {
      result: accessToken,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    // 4. Update lastUsedAt fire-and-forget
    this.repository
      .updateFederationAccessToken(accessToken.id, { lastUsedAt: new Date() })
      .catch(() => {});

    return accessToken;
  }

  async updateAccessTokenPermissions(
    id: string,
    permissions: Partial<FederationPermissions>
  ): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenById(id);

    if (!accessToken) {
      return null;
    }

    const updatedPermissions: FederationPermissions = {
      ...accessToken.permissions,
      ...permissions,
    };

    const updated = await this.repository.updateFederationAccessToken(id, {
      permissions: updatedPermissions,
    });

    // Invalidar cache después del commit para evitar que una request
    // concurrente cachee el valor viejo durante los ~ms del UPDATE.
    this.invalidateCacheByTokenId(id);

    return updated;
  }

  async getUserInvitationTokens(userId: string): Promise<FederationToken[]> {
    return this.repository.findFederationTokensByUserId(userId);
  }

  async getUserAccessTokens(userId: string): Promise<FederationAccessToken[]> {
    return this.repository.findFederationAccessTokensByOwnerId(userId);
  }

  async revokeAccessToken(id: string): Promise<boolean> {
    this.invalidateCacheByTokenId(id);
    return this.repository.revokeFederationAccessToken(id);
  }

  /** Invalida la entrada de cache in-memory para un token por su ID */
  private invalidateCacheByTokenId(id: string): void {
    for (const [key, value] of this.validatedTokens.entries()) {
      if (value.result.id === id) {
        this.validatedTokens.delete(key);
        break;
      }
    }
  }

  async reactivateAccessToken(id: string): Promise<FederationAccessToken | null> {
    return this.repository.updateFederationAccessToken(id, { isActive: true });
  }

  async deleteAccessToken(id: string): Promise<boolean> {
    return this.repository.deleteFederationAccessToken(id);
  }

  async deleteInvitationToken(id: string): Promise<boolean> {
    return this.repository.deleteFederationToken(id);
  }

  async cleanupExpiredTokens(): Promise<number> {
    return this.repository.deleteExpiredFederationTokens();
  }

  async getPendingMutualRequests(userId: string): Promise<FederationAccessToken[]> {
    return this.repository.findPendingMutualRequests(userId);
  }

  async approveMutualRequest(accessTokenId: string): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenById(accessTokenId);
    if (!accessToken || accessToken.mutualStatus !== 'pending') {
      return null;
    }

    return this.repository.updateMutualStatus(accessTokenId, 'approved');
  }

  async rejectMutualRequest(accessTokenId: string): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenById(accessTokenId);
    if (!accessToken || accessToken.mutualStatus !== 'pending') {
      return null;
    }

    return this.repository.updateMutualStatus(accessTokenId, 'rejected');
  }

  async getAccessTokenById(id: string): Promise<FederationAccessToken | null> {
    return this.repository.findFederationAccessTokenById(id);
  }
}
