import { Injectable, Inject, HttpException, HttpStatus, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../ports/federation.repository';
import { ConnectedServer } from '@infrastructure/database/schema';
import { FederationTokenService } from './federation-token.service';

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
    @Inject(forwardRef(() => FederationTokenService))
    private readonly tokenService: FederationTokenService,
  ) {}

  /**
   * Connect to a remote server using an invitation token
   * @param requestMutual - If true, generates an invitation token and sends it to request mutual federation
   */
  async connectToServer(
    userId: string,
    serverUrl: string,
    invitationToken: string,
    serverName?: string,
    localServerUrl?: string,
    requestMutual = false,
  ): Promise<ConnectedServer> {
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(serverUrl);

    // Check if already connected
    const existing = await this.repository.findConnectedServerByUrl(userId, normalizedUrl);
    if (existing) {
      throw new HttpException('Already connected to this server', HttpStatus.CONFLICT);
    }

    // If requesting mutual federation, we need a local server URL
    if (requestMutual && !localServerUrl) {
      throw new HttpException(
        'Local server URL is required for mutual federation',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate a mutual invitation token if requested
    let mutualInvitationToken: string | undefined;
    if (requestMutual && localServerUrl) {
      const token = await this.tokenService.generateInvitationToken(
        userId,
        `Mutual federation with ${normalizedUrl}`,
        7, // 7 days expiration
        1, // Single use
      );
      mutualInvitationToken = token.token;
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
          serverUrl: localServerUrl,
          requestMutual,
          mutualInvitationToken,
        }),
      });

      // Create connected server record
      // Mark as online since we just successfully connected
      const now = new Date();
      const connectedServer = await this.repository.createConnectedServer({
        userId,
        name: response.serverInfo.name || serverName || 'Remote Server',
        baseUrl: normalizedUrl,
        authToken: response.accessToken,
        remoteAlbumCount: response.serverInfo.albumCount,
        remoteTrackCount: response.serverInfo.trackCount,
        remoteArtistCount: response.serverInfo.artistCount,
        lastSyncAt: now,
        isOnline: true,
        lastOnlineAt: now,
        lastCheckedAt: now,
      });

      this.logger.info(
        { serverId: connectedServer.id, serverUrl: normalizedUrl, requestMutual },
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
   * Check if a server is reachable and update its online status
   */
  async pingServer(server: ConnectedServer): Promise<boolean> {
    const now = new Date();
    try {
      await this.makeAuthenticatedRequest<{ ok: boolean }>(
        server,
        '/api/federation/ping',
      );

      // Server is online - update status
      await this.repository.updateConnectedServer(server.id, {
        isOnline: true,
        lastOnlineAt: now,
        lastCheckedAt: now,
        lastError: null,
        lastErrorAt: null,
      });

      return true;
    } catch (error) {
      // Server is offline - update status
      await this.repository.updateConnectedServer(server.id, {
        isOnline: false,
        lastCheckedAt: now,
        lastError: error instanceof Error ? error.message : 'Connection failed',
        lastErrorAt: now,
      });

      return false;
    }
  }

  /**
   * Check health of all servers for a user
   */
  async checkAllServersHealth(userId: string): Promise<ConnectedServer[]> {
    const servers = await this.repository.findConnectedServersByUserId(userId);

    // Ping all servers in parallel
    await Promise.all(
      servers.map(async (server) => {
        await this.pingServer(server);
      }),
    );

    // Return updated servers
    return this.repository.findConnectedServersByUserId(userId);
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

  /** Default timeout for HTTP requests (30 seconds) */
  private static readonly REQUEST_TIMEOUT = 30000;

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

  /**
   * Validate that a URL is well-formed and safe
   * Throws an error if the URL is invalid
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }
      // Block localhost and private IPs in production (basic check)
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        this.logger.warn({ hostname }, 'Allowing localhost connection (development mode)');
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new HttpException(`Invalid URL format: ${url}`, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  private async makeRequest<T>(
    baseUrl: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${baseUrl}${path}`;

    // Validate URL before making request
    this.validateUrl(url);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RemoteServerService.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          `Request to ${baseUrl} timed out after ${RemoteServerService.REQUEST_TIMEOUT / 1000}s`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
