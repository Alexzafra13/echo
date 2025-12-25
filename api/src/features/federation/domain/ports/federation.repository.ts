import {
  ConnectedServer,
  NewConnectedServer,
  FederationToken,
  NewFederationToken,
  FederationAccessToken,
  NewFederationAccessToken,
  AlbumImportQueue,
  NewAlbumImportQueue,
  ImportStatus,
  MutualFederationStatus,
} from '../types';

/**
 * Port for federation data access
 * Defines the contract for persisting and retrieving federation-related entities
 */
export interface IFederationRepository {
  // Connected Servers
  createConnectedServer(data: NewConnectedServer): Promise<ConnectedServer>;
  findConnectedServerById(id: string): Promise<ConnectedServer | null>;
  findConnectedServersByUserId(userId: string): Promise<ConnectedServer[]>;
  findConnectedServerByUrl(userId: string, baseUrl: string): Promise<ConnectedServer | null>;
  updateConnectedServer(id: string, data: Partial<ConnectedServer>): Promise<ConnectedServer | null>;
  deleteConnectedServer(id: string): Promise<boolean>;

  // Federation Tokens (Invitation codes)
  createFederationToken(data: NewFederationToken): Promise<FederationToken>;
  findFederationTokenByToken(token: string): Promise<FederationToken | null>;
  findFederationTokenById(id: string): Promise<FederationToken | null>;
  findFederationTokensByUserId(userId: string): Promise<FederationToken[]>;
  updateFederationToken(id: string, data: Partial<FederationToken>): Promise<FederationToken | null>;
  deleteFederationToken(id: string): Promise<boolean>;
  deleteExpiredFederationTokens(): Promise<number>;
  /**
   * Atomically use an invitation token - increments currentUses and returns token
   * Returns null if token is invalid, expired, or max uses reached
   * This prevents race conditions when multiple servers try to use the same token
   */
  useInvitationTokenAtomic(
    token: string,
    serverName: string,
    ip?: string,
  ): Promise<FederationToken | null>;

  // Federation Access Tokens (Long-lived tokens for connected servers)
  createFederationAccessToken(data: NewFederationAccessToken): Promise<FederationAccessToken>;
  findFederationAccessTokenByToken(token: string): Promise<FederationAccessToken | null>;
  findFederationAccessTokenById(id: string): Promise<FederationAccessToken | null>;
  findFederationAccessTokensByOwnerId(ownerId: string): Promise<FederationAccessToken[]>;
  updateFederationAccessToken(id: string, data: Partial<FederationAccessToken>): Promise<FederationAccessToken | null>;
  deleteFederationAccessToken(id: string): Promise<boolean>;
  revokeFederationAccessToken(id: string): Promise<boolean>;

  // Album Import Queue
  createAlbumImport(data: NewAlbumImportQueue): Promise<AlbumImportQueue>;
  findAlbumImportById(id: string): Promise<AlbumImportQueue | null>;
  findAlbumImportsByUserId(userId: string): Promise<AlbumImportQueue[]>;
  findPendingAlbumImports(): Promise<AlbumImportQueue[]>;
  updateAlbumImport(id: string, data: Partial<AlbumImportQueue>): Promise<AlbumImportQueue | null>;
  updateAlbumImportStatus(id: string, status: ImportStatus, errorMessage?: string): Promise<AlbumImportQueue | null>;
  deleteAlbumImport(id: string): Promise<boolean>;

  // Mutual Federation
  findPendingMutualRequests(ownerId: string): Promise<FederationAccessToken[]>;
  updateMutualStatus(id: string, status: MutualFederationStatus): Promise<FederationAccessToken | null>;
}

export const FEDERATION_REPOSITORY = Symbol('FEDERATION_REPOSITORY');
