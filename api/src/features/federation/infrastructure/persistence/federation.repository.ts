import { Injectable } from '@nestjs/common';
import { eq, and, lt, gt, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import {
  connectedServers,
  federationTokens,
  federationAccessTokens,
  albumImportQueue,
} from '@infrastructure/database/schema';
import {
  IFederationRepository,
} from '../../domain/ports/federation.repository';
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
} from '../../domain/types';

@Injectable()
export class FederationRepository implements IFederationRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  // Mappers: Drizzle devuelve string, el dominio espera union types
  private mapToAlbumImportQueue(record: typeof albumImportQueue.$inferSelect): AlbumImportQueue {
    return {
      ...record,
      status: record.status as ImportStatus,
    };
  }

  private mapToFederationAccessToken(record: typeof federationAccessTokens.$inferSelect): FederationAccessToken {
    return {
      ...record,
      mutualStatus: record.mutualStatus as MutualFederationStatus,
    };
  }

  async createConnectedServer(data: NewConnectedServer): Promise<ConnectedServer> {
    const [server] = await this.drizzle.db
      .insert(connectedServers)
      .values(data)
      .returning();
    return server;
  }

  async findConnectedServerById(id: string): Promise<ConnectedServer | null> {
    const [server] = await this.drizzle.db
      .select()
      .from(connectedServers)
      .where(eq(connectedServers.id, id))
      .limit(1);
    return server ?? null;
  }

  async findConnectedServersByUserId(userId: string): Promise<ConnectedServer[]> {
    return this.drizzle.db
      .select()
      .from(connectedServers)
      .where(eq(connectedServers.userId, userId));
  }

  async findConnectedServerByUrl(userId: string, baseUrl: string): Promise<ConnectedServer | null> {
    const [server] = await this.drizzle.db
      .select()
      .from(connectedServers)
      .where(
        and(
          eq(connectedServers.userId, userId),
          eq(connectedServers.baseUrl, baseUrl),
        ),
      )
      .limit(1);
    return server ?? null;
  }

  async updateConnectedServer(
    id: string,
    data: Partial<ConnectedServer>,
  ): Promise<ConnectedServer | null> {
    const [server] = await this.drizzle.db
      .update(connectedServers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(connectedServers.id, id))
      .returning();
    return server ?? null;
  }

  async deleteConnectedServer(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(connectedServers)
      .where(eq(connectedServers.id, id))
      .returning();
    return result.length > 0;
  }

  async createFederationToken(data: NewFederationToken): Promise<FederationToken> {
    const [token] = await this.drizzle.db
      .insert(federationTokens)
      .values(data)
      .returning();
    return token;
  }

  async findFederationTokenByToken(token: string): Promise<FederationToken | null> {
    const [result] = await this.drizzle.db
      .select()
      .from(federationTokens)
      .where(eq(federationTokens.token, token))
      .limit(1);
    return result ?? null;
  }

  async findFederationTokenById(id: string): Promise<FederationToken | null> {
    const [result] = await this.drizzle.db
      .select()
      .from(federationTokens)
      .where(eq(federationTokens.id, id))
      .limit(1);
    return result ?? null;
  }

  async findFederationTokensByUserId(userId: string): Promise<FederationToken[]> {
    return this.drizzle.db
      .select()
      .from(federationTokens)
      .where(eq(federationTokens.createdByUserId, userId));
  }

  async updateFederationToken(
    id: string,
    data: Partial<FederationToken>,
  ): Promise<FederationToken | null> {
    const [token] = await this.drizzle.db
      .update(federationTokens)
      .set(data)
      .where(eq(federationTokens.id, id))
      .returning();
    return token ?? null;
  }

  async deleteFederationToken(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(federationTokens)
      .where(eq(federationTokens.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteExpiredFederationTokens(): Promise<number> {
    const result = await this.drizzle.db
      .delete(federationTokens)
      .where(lt(federationTokens.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  async useInvitationTokenAtomic(
    token: string,
    serverName: string,
    ip?: string,
  ): Promise<FederationToken | null> {
    const now = new Date();

    // Actualización atómica: solo aplica si el token es válido, no expirado y tiene usos disponibles
    const [updated] = await this.drizzle.db
      .update(federationTokens)
      .set({
        currentUses: sql`${federationTokens.currentUses} + 1`,
        isUsed: sql`${federationTokens.currentUses} + 1 >= ${federationTokens.maxUses}`,
        usedByServerName: serverName,
        usedByIp: ip,
        usedAt: now,
      })
      .where(
        and(
          eq(federationTokens.token, token),
          gt(federationTokens.expiresAt, now),
          sql`${federationTokens.currentUses} < ${federationTokens.maxUses}`,
        ),
      )
      .returning();

    return updated ?? null;
  }

  async createFederationAccessToken(
    data: NewFederationAccessToken,
  ): Promise<FederationAccessToken> {
    const [token] = await this.drizzle.db
      .insert(federationAccessTokens)
      .values(data)
      .returning();
    return this.mapToFederationAccessToken(token);
  }

  async findFederationAccessTokenByToken(token: string): Promise<FederationAccessToken | null> {
    const [result] = await this.drizzle.db
      .select()
      .from(federationAccessTokens)
      .where(
        and(
          eq(federationAccessTokens.token, token),
          eq(federationAccessTokens.isActive, true),
        ),
      )
      .limit(1);
    return result ? this.mapToFederationAccessToken(result) : null;
  }

  async findFederationAccessTokenById(id: string): Promise<FederationAccessToken | null> {
    const [result] = await this.drizzle.db
      .select()
      .from(federationAccessTokens)
      .where(eq(federationAccessTokens.id, id))
      .limit(1);
    return result ? this.mapToFederationAccessToken(result) : null;
  }

  async findFederationAccessTokensByOwnerId(ownerId: string): Promise<FederationAccessToken[]> {
    const results = await this.drizzle.db
      .select()
      .from(federationAccessTokens)
      .where(eq(federationAccessTokens.ownerId, ownerId));
    return results.map((r) => this.mapToFederationAccessToken(r));
  }

  async updateFederationAccessToken(
    id: string,
    data: Partial<FederationAccessToken>,
  ): Promise<FederationAccessToken | null> {
    const [token] = await this.drizzle.db
      .update(federationAccessTokens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(federationAccessTokens.id, id))
      .returning();
    return token ? this.mapToFederationAccessToken(token) : null;
  }

  async deleteFederationAccessToken(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(federationAccessTokens)
      .where(eq(federationAccessTokens.id, id))
      .returning();
    return result.length > 0;
  }

  async revokeFederationAccessToken(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .update(federationAccessTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(federationAccessTokens.id, id))
      .returning();
    return result.length > 0;
  }

  async createAlbumImport(data: NewAlbumImportQueue): Promise<AlbumImportQueue> {
    const [importItem] = await this.drizzle.db
      .insert(albumImportQueue)
      .values(data)
      .returning();
    return this.mapToAlbumImportQueue(importItem);
  }

  async findAlbumImportById(id: string): Promise<AlbumImportQueue | null> {
    const [result] = await this.drizzle.db
      .select()
      .from(albumImportQueue)
      .where(eq(albumImportQueue.id, id))
      .limit(1);
    return result ? this.mapToAlbumImportQueue(result) : null;
  }

  async findAlbumImportsByUserId(userId: string): Promise<AlbumImportQueue[]> {
    const results = await this.drizzle.db
      .select()
      .from(albumImportQueue)
      .where(eq(albumImportQueue.userId, userId));
    return results.map((r) => this.mapToAlbumImportQueue(r));
  }

  async findPendingAlbumImports(): Promise<AlbumImportQueue[]> {
    const results = await this.drizzle.db
      .select()
      .from(albumImportQueue)
      .where(eq(albumImportQueue.status, 'pending'));
    return results.map((r) => this.mapToAlbumImportQueue(r));
  }

  async updateAlbumImport(
    id: string,
    data: Partial<AlbumImportQueue>,
  ): Promise<AlbumImportQueue | null> {
    const [importItem] = await this.drizzle.db
      .update(albumImportQueue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(albumImportQueue.id, id))
      .returning();
    return importItem ? this.mapToAlbumImportQueue(importItem) : null;
  }

  async updateAlbumImportStatus(
    id: string,
    status: ImportStatus,
    errorMessage?: string,
  ): Promise<AlbumImportQueue | null> {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'downloading') {
      updateData.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const [importItem] = await this.drizzle.db
      .update(albumImportQueue)
      .set(updateData)
      .where(eq(albumImportQueue.id, id))
      .returning();
    return importItem ? this.mapToAlbumImportQueue(importItem) : null;
  }

  async deleteAlbumImport(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(albumImportQueue)
      .where(eq(albumImportQueue.id, id))
      .returning();
    return result.length > 0;
  }

  async findPendingMutualRequests(ownerId: string): Promise<FederationAccessToken[]> {
    const results = await this.drizzle.db
      .select()
      .from(federationAccessTokens)
      .where(
        and(
          eq(federationAccessTokens.ownerId, ownerId),
          eq(federationAccessTokens.mutualStatus, 'pending'),
          eq(federationAccessTokens.isActive, true),
        ),
      );
    return results.map((r) => this.mapToFederationAccessToken(r));
  }

  async updateMutualStatus(
    id: string,
    status: MutualFederationStatus,
  ): Promise<FederationAccessToken | null> {
    const [token] = await this.drizzle.db
      .update(federationAccessTokens)
      .set({
        mutualStatus: status,
        mutualRespondedAt: status !== 'pending' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(federationAccessTokens.id, id))
      .returning();
    return token ? this.mapToFederationAccessToken(token) : null;
  }
}
