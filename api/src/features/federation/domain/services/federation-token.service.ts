import { Injectable, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../ports/federation.repository';
import {
  FederationToken,
  FederationAccessToken,
  FederationPermissions,
  MutualFederationStatus,
} from '@infrastructure/database/schema';

@Injectable()
export class FederationTokenService {
  constructor(
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  /**
   * Generate a new invitation token for others to connect to our server
   * Token expires after 7 days by default
   */
  async generateInvitationToken(
    userId: string,
    name?: string,
    expiresInDays = 7,
    maxUses = 1,
  ): Promise<FederationToken> {
    // Generate random token (16 characters, formatted as XXXX-XXXX-XXXX-XXXX)
    const rawToken = randomBytes(8).toString('hex').toUpperCase();
    const token = `${rawToken.slice(0, 4)}-${rawToken.slice(4, 8)}-${rawToken.slice(8, 12)}-${rawToken.slice(12, 16)}`;

    // Calculate expiration date
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

  /**
   * Validate an invitation token and return it if valid
   */
  async validateInvitationToken(token: string): Promise<FederationToken | null> {
    const federationToken = await this.repository.findFederationTokenByToken(token);

    if (!federationToken) {
      return null;
    }

    // Check if expired
    if (federationToken.expiresAt < new Date()) {
      return null;
    }

    // Check if max uses reached
    if (federationToken.currentUses >= federationToken.maxUses) {
      return null;
    }

    return federationToken;
  }

  /**
   * Mark an invitation token as used and create access token for the connecting server
   * Uses atomic update to prevent race conditions when multiple servers try to use the same token
   * @param mutualInvitationToken - Token provided by the connecting server for mutual federation
   */
  async useInvitationToken(
    token: string,
    serverName: string,
    serverUrl?: string,
    ip?: string,
    mutualInvitationToken?: string,
  ): Promise<FederationAccessToken | null> {
    // Use atomic update to prevent race condition
    // This ensures that if two servers try to use the same token simultaneously,
    // only one will succeed (the one that gets the row lock first)
    const federationToken = await this.repository.useInvitationTokenAtomic(
      token,
      serverName,
      ip,
    );

    if (!federationToken) {
      return null;
    }

    // Generate access token for the connecting server
    const accessToken = randomBytes(32).toString('hex');

    // Determine mutual status based on whether a mutual token was provided
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

  /**
   * Validate an access token and return it if valid
   */
  async validateAccessToken(token: string): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenByToken(token);

    if (!accessToken || !accessToken.isActive) {
      return null;
    }

    // Check if expired (if expiration is set)
    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await this.repository.updateFederationAccessToken(accessToken.id, {
      lastUsedAt: new Date(),
    });

    return accessToken;
  }

  /**
   * Update access token permissions
   */
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

  /**
   * Get all invitation tokens created by a user
   */
  async getUserInvitationTokens(userId: string): Promise<FederationToken[]> {
    return this.repository.findFederationTokensByUserId(userId);
  }

  /**
   * Get all access tokens owned by a user (servers that can access their library)
   */
  async getUserAccessTokens(userId: string): Promise<FederationAccessToken[]> {
    return this.repository.findFederationAccessTokensByOwnerId(userId);
  }

  /**
   * Revoke an access token
   */
  async revokeAccessToken(id: string): Promise<boolean> {
    return this.repository.revokeFederationAccessToken(id);
  }

  /**
   * Delete an invitation token
   */
  async deleteInvitationToken(id: string): Promise<boolean> {
    return this.repository.deleteFederationToken(id);
  }

  /**
   * Cleanup expired invitation tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.repository.deleteExpiredFederationTokens();
  }

  // ============================================
  // Mutual Federation
  // ============================================

  /**
   * Get access tokens with pending mutual federation requests
   */
  async getPendingMutualRequests(userId: string): Promise<FederationAccessToken[]> {
    return this.repository.findPendingMutualRequests(userId);
  }

  /**
   * Approve a mutual federation request
   * Returns the access token with the invitation token to use for connecting back
   */
  async approveMutualRequest(accessTokenId: string): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenById(accessTokenId);
    if (!accessToken || accessToken.mutualStatus !== 'pending') {
      return null;
    }

    return this.repository.updateMutualStatus(accessTokenId, 'approved');
  }

  /**
   * Reject a mutual federation request
   */
  async rejectMutualRequest(accessTokenId: string): Promise<FederationAccessToken | null> {
    const accessToken = await this.repository.findFederationAccessTokenById(accessTokenId);
    if (!accessToken || accessToken.mutualStatus !== 'pending') {
      return null;
    }

    return this.repository.updateMutualStatus(accessTokenId, 'rejected');
  }

  /**
   * Get access token by ID
   */
  async getAccessTokenById(id: string): Promise<FederationAccessToken | null> {
    return this.repository.findFederationAccessTokenById(id);
  }
}
