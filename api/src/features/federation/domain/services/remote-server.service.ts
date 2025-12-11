import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../ports/federation.repository';
import { ConnectedServer } from '@infrastructure/database/schema';

/**
 * DTOs for remote server responses
 */
export interface RemoteServerInfo {
  name: string;
  version: string;
  albumCount: number;
  trackCount: number;
  artistCount: number;
}

export interface RemoteAlbum {
  id: string;
  name: string;
  artistName: string;
  artistId: string;
  year?: number;
  songCount: number;
  duration: number;
  size: number;
  coverUrl?: string;
  genres?: string[];
}

export interface RemoteTrack {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  albumName: string;
  albumId: string;
  trackNumber?: number;
  discNumber?: number;
  duration: number;
  size: number;
  bitRate?: number;
  format?: string;
}

export interface RemoteArtist {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
  imageUrl?: string;
  genres?: string[];
}

export interface RemoteLibrary {
  albums: RemoteAlbum[];
  totalAlbums: number;
  totalTracks: number;
  totalArtists: number;
}

@Injectable()
export class RemoteServerService {
  constructor(
    @InjectPinoLogger(RemoteServerService.name)
    private readonly logger: PinoLogger,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  /**
   * Connect to a remote server using an invitation token
   */
  async connectToServer(
    userId: string,
    serverUrl: string,
    invitationToken: string,
    serverName?: string,
  ): Promise<ConnectedServer> {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(serverUrl);

    // Check if already connected
    const existing = await this.repository.findConnectedServerByUrl(userId, normalizedUrl);
    if (existing) {
      throw new HttpException('Already connected to this server', HttpStatus.CONFLICT);
    }

    // Try to connect to the remote server
    try {
      const response = await this.makeRequest<{
        accessToken: string;
        serverInfo: RemoteServerInfo;
      }>(normalizedUrl, '/api/federation/connect', {
        method: 'POST',
        body: JSON.stringify({
          invitationToken,
          serverName: serverName || 'Echo Server',
        }),
      });

      // Create connected server record
      const connectedServer = await this.repository.createConnectedServer({
        userId,
        name: response.serverInfo.name || serverName || 'Remote Server',
        baseUrl: normalizedUrl,
        authToken: response.accessToken,
        remoteAlbumCount: response.serverInfo.albumCount,
        remoteTrackCount: response.serverInfo.trackCount,
        remoteArtistCount: response.serverInfo.artistCount,
        lastSyncAt: new Date(),
      });

      this.logger.info(
        { serverId: connectedServer.id, serverUrl: normalizedUrl },
        'Successfully connected to remote server',
      );

      return connectedServer;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error, serverUrl: normalizedUrl },
        'Failed to connect to remote server',
      );
      throw new HttpException(
        `Failed to connect to server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get library from a connected server
   */
  async getRemoteLibrary(
    server: ConnectedServer,
    page = 1,
    limit = 50,
  ): Promise<RemoteLibrary> {
    try {
      const response = await this.makeAuthenticatedRequest<RemoteLibrary>(
        server,
        `/api/federation/library?page=${page}&limit=${limit}`,
      );

      // Update server stats
      await this.repository.updateConnectedServer(server.id, {
        remoteAlbumCount: response.totalAlbums,
        remoteTrackCount: response.totalTracks,
        remoteArtistCount: response.totalArtists,
        lastSyncAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      });

      return response;
    } catch (error) {
      await this.handleServerError(server, error);
      throw error;
    }
  }

  /**
   * Get albums from a connected server
   */
  async getRemoteAlbums(
    server: ConnectedServer,
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<{ albums: RemoteAlbum[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) {
        params.append('search', search);
      }

      return await this.makeAuthenticatedRequest<{ albums: RemoteAlbum[]; total: number }>(
        server,
        `/api/federation/albums?${params}`,
      );
    } catch (error) {
      await this.handleServerError(server, error);
      throw error;
    }
  }

  /**
   * Get a specific album from a connected server
   */
  async getRemoteAlbum(
    server: ConnectedServer,
    albumId: string,
  ): Promise<RemoteAlbum & { tracks: RemoteTrack[] }> {
    try {
      return await this.makeAuthenticatedRequest<RemoteAlbum & { tracks: RemoteTrack[] }>(
        server,
        `/api/federation/albums/${albumId}`,
      );
    } catch (error) {
      await this.handleServerError(server, error);
      throw error;
    }
  }

  /**
   * Get stream URL for a track from a connected server
   */
  getRemoteStreamUrl(server: ConnectedServer, trackId: string): string {
    return `${server.baseUrl}/api/federation/stream/${trackId}?token=${server.authToken}`;
  }

  /**
   * Get download URL for an album from a connected server
   */
  getRemoteAlbumDownloadUrl(server: ConnectedServer, albumId: string): string {
    return `${server.baseUrl}/api/federation/albums/${albumId}/download?token=${server.authToken}`;
  }

  /**
   * Check if a server is reachable
   */
  async pingServer(server: ConnectedServer): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest<{ ok: boolean }>(
        server,
        '/api/federation/ping',
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sync server stats (album count, track count, etc.)
   */
  async syncServerStats(server: ConnectedServer): Promise<ConnectedServer> {
    try {
      const info = await this.makeAuthenticatedRequest<RemoteServerInfo>(
        server,
        '/api/federation/info',
      );

      return (await this.repository.updateConnectedServer(server.id, {
        remoteAlbumCount: info.albumCount,
        remoteTrackCount: info.trackCount,
        remoteArtistCount: info.artistCount,
        lastSyncAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      }))!;
    } catch (error) {
      await this.handleServerError(server, error);
      throw error;
    }
  }

  /**
   * Disconnect from a server
   */
  async disconnectFromServer(serverId: string): Promise<boolean> {
    const server = await this.repository.findConnectedServerById(serverId);
    if (!server) {
      return false;
    }

    // Try to notify the remote server (best effort)
    try {
      await this.makeAuthenticatedRequest(
        server,
        '/api/federation/disconnect',
        { method: 'POST' },
      );
    } catch {
      // Ignore errors, we're disconnecting anyway
    }

    return this.repository.deleteConnectedServer(serverId);
  }

  // ============================================
  // Private helpers
  // ============================================

  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    return normalized;
  }

  private async makeRequest<T>(
    baseUrl: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Echo Music Server/1.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  private async makeAuthenticatedRequest<T>(
    server: ConnectedServer,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    return this.makeRequest<T>(server.baseUrl, path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${server.authToken}`,
      },
    });
  }

  private async handleServerError(server: ConnectedServer, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await this.repository.updateConnectedServer(server.id, {
      lastError: errorMessage,
      lastErrorAt: new Date(),
    });
    this.logger.error(
      { serverId: server.id, serverUrl: server.baseUrl, error: errorMessage },
      'Error communicating with remote server',
    );
  }
}
