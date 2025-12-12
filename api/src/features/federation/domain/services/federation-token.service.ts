import { Injectable, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../ports/federation.repository';
import {
  FederationToken,
  FederationAccessToken,
  FederationPermissions,
  FederationRequest,
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
   */
  async useInvitationToken(
    token: string,
    serverName: string,
    serverUrl?: string,
    ip?: string,
  ): Promise<FederationAccessToken | null> {
    const federationToken = await this.validateInvitationToken(token);

    if (!federationToken) {
      return null;
    }

    // Update token usage
    await this.repository.updateFederationToken(federationToken.id, {
      currentUses: federationToken.currentUses + 1,
      isUsed: federationToken.currentUses + 1 >= federationToken.maxUses,
      usedByServerName: serverName,
      usedByIp: ip,
      usedAt: new Date(),
    });

    // Generate access token for the connecting server
    const accessToken = randomBytes(32).toString('hex');

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
  // Federation Requests (Mutual Federation)
  // ============================================

  /**
   * Create a federation request (when a server wants mutual access)
   */
  async createFederationRequest(
    userId: string,
    serverName: string,
    serverUrl: string,
    invitationToken: string,
    expiresInDays = 7,
  ): Promise<FederationRequest> {
    // Check if there's already a pending request from this server
    const existing = await this.repository.findFederationRequestByServerUrl(userId, serverUrl);
    if (existing) {
      // Update the existing request with the new token
      return (await this.repository.updateFederationRequest(existing.id, {
        invitationToken,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      }))!;
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    return this.repository.createFederationRequest({
      userId,
      serverName,
      serverUrl,
      invitationToken,
      expiresAt,
    });
  }

  /**
   * Get all federation requests for a user
   */
  async getUserFederationRequests(userId: string): Promise<FederationRequest[]> {
    return this.repository.findFederationRequestsByUserId(userId);
  }

  /**
   * Get pending federation requests for a user
   */
  async getPendingFederationRequests(userId: string): Promise<FederationRequest[]> {
    return this.repository.findPendingFederationRequestsByUserId(userId);
  }

  /**
   * Get a federation request by ID
   */
  async getFederationRequestById(id: string): Promise<FederationRequest | null> {
    return this.repository.findFederationRequestById(id);
  }

  /**
   * Approve a federation request
   * Returns the request with updated status
   */
  async approveFederationRequest(id: string): Promise<FederationRequest | null> {
    const request = await this.repository.findFederationRequestById(id);
    if (!request || request.status !== 'pending') {
      return null;
    }

    // Check if expired
    if (request.expiresAt < new Date()) {
      await this.repository.updateFederationRequestStatus(id, 'expired');
      return null;
    }

    return this.repository.updateFederationRequestStatus(id, 'approved');
  }

  /**
   * Reject a federation request
   */
  async rejectFederationRequest(id: string): Promise<FederationRequest | null> {
    return this.repository.updateFederationRequestStatus(id, 'rejected');
  }

  /**
   * Delete a federation request
   */
  async deleteFederationRequest(id: string): Promise<boolean> {
    return this.repository.deleteFederationRequest(id);
  }

  /**
   * Cleanup expired federation requests
   */
  async cleanupExpiredFederationRequests(): Promise<number> {
    return this.repository.deleteExpiredFederationRequests();
  }
}
