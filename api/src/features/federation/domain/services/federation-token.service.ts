import { Injectable, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../ports/federation.repository';
import {
  FederationToken,
  FederationAccessToken,
  FederationPermissions,
  MutualFederationStatus,
} from '../types';

@Injectable()
export class FederationTokenService {
  constructor(
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  async generateInvitationToken(
    userId: string,
    name?: string,
    expiresInDays = 7,
    maxUses = 1,
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
    mutualInvitationToken?: string,
  ): Promise<FederationAccessToken | null> {
    const federationToken = await this.repository.useInvitationTokenAtomic(
      token,
      serverName,
      ip,
    );

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
    const accessToken = await this.repository.findFederationAccessTokenByToken(token);

    if (!accessToken || !accessToken.isActive) {
      return null;
    }

    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      return null;
    }

    await this.repository.updateFederationAccessToken(accessToken.id, {
      lastUsedAt: new Date(),
    });

    return accessToken;
  }

  async updateAccessTokenPermissions(
    id: string,
    permissions: Partial<FederationPermissions>,
  ): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenById(id);

    if (!accessToken) {
      return null;
    }

    const updatedPermissions: FederationPermissions = {
      ...accessToken.permissions,
      ...permissions,
    };

    return this.repository.updateFederationAccessToken(id, {
      permissions: updatedPermissions,
    });
  }

  async getUserInvitationTokens(userId: string): Promise<FederationToken[]> {
    return this.repository.findFederationTokensByUserId(userId);
  }

  async getUserAccessTokens(userId: string): Promise<FederationAccessToken[]> {
    return this.repository.findFederationAccessTokensByOwnerId(userId);
  }

  async revokeAccessToken(id: string): Promise<boolean> {
    return this.repository.revokeFederationAccessToken(id);
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
