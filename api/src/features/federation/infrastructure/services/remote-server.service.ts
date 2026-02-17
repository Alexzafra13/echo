import { Injectable, Inject, HttpException, HttpStatus, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../../domain/ports/federation.repository';
import { ConnectedServer } from '../../domain/types';
import { FederationTokenService } from '../../domain/services/federation-token.service';

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

  async connectToServer(
    userId: string,
    serverUrl: string,
    invitationToken: string,
    serverName?: string,
    localServerUrl?: string,
    requestMutual = false,
  ): Promise<ConnectedServer> {
    const normalizedUrl = this.normalizeUrl(serverUrl);

    const existing = await this.repository.findConnectedServerByUrl(userId, normalizedUrl);
    if (existing) {
      throw new HttpException('Already connected to this server', HttpStatus.CONFLICT);
    }

    if (requestMutual && !localServerUrl) {
      throw new HttpException(
        'Local server URL is required for mutual federation',
        HttpStatus.BAD_REQUEST,
      );
    }

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

  async getRemoteAlbumCover(
    server: ConnectedServer,
    albumId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const url = `${server.baseUrl}/api/federation/albums/${albumId}/cover`;

      this.logger.debug(
        { url, serverId: server.id, albumId },
        'Fetching remote album cover',
      );

      this.validateUrl(url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RemoteServerService.REQUEST_TIMEOUT);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${server.authToken}`,
            'User-Agent': 'Echo Music Server/1.0',
          },
        });

        if (!response.ok) {
          this.logger.warn(
            { url, status: response.status, albumId },
            'Remote server returned error for album cover',
          );
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        this.logger.debug(
          { albumId, contentType, size: arrayBuffer.byteLength },
          'Successfully fetched remote album cover',
        );

        return {
          buffer: Buffer.from(arrayBuffer),
          contentType,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      this.logger.warn(
        { serverId: server.id, albumId, error: error instanceof Error ? error.message : error },
        'Failed to fetch remote album cover',
      );
      return null;
    }
  }

  async streamRemoteTrack(
    server: ConnectedServer,
    trackId: string,
    range?: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    headers: Record<string, string>;
    statusCode: number;
  } | null> {
    const url = `${server.baseUrl}/api/federation/stream/${trackId}`;

    try {
      this.validateUrl(url);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${server.authToken}`,
        'User-Agent': 'Echo Music Server/1.0',
      };

      if (range) {
        headers['Range'] = range;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for streaming

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers,
        });

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const responseHeaders: Record<string, string> = {};
        const headersToCopy = [
          'content-type',
          'content-length',
          'content-range',
          'accept-ranges',
          'cache-control',
        ];

        for (const header of headersToCopy) {
          const value = response.headers.get(header);
          if (value) {
            responseHeaders[header] = value;
          }
        }

        const { Readable } = await import('stream');
        const nodeStream = Readable.fromWeb(response.body as any);

        return {
          stream: nodeStream,
          headers: responseHeaders,
          statusCode: response.status,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      this.logger.error(
        { serverId: server.id, trackId, error: error instanceof Error ? error.message : error },
        'Failed to stream remote track',
      );
      return null;
    }
  }

  async pingServer(server: ConnectedServer): Promise<boolean> {
    const now = new Date();
    try {
      await this.makeAuthenticatedRequest<{ ok: boolean }>(
        server,
        '/api/federation/ping',
      );

      await this.repository.updateConnectedServer(server.id, {
        isOnline: true,
        lastOnlineAt: now,
        lastCheckedAt: now,
        lastError: null,
        lastErrorAt: null,
      });

      return true;
    } catch (error) {
      await this.repository.updateConnectedServer(server.id, {
        isOnline: false,
        lastCheckedAt: now,
        lastError: error instanceof Error ? error.message : 'Connection failed',
        lastErrorAt: now,
      });

      return false;
    }
  }

  async checkAllServersHealth(userId: string): Promise<ConnectedServer[]> {
    const servers = await this.repository.findConnectedServersByUserId(userId);

    await Promise.all(
      servers.map(async (server) => {
        await this.pingServer(server);
      }),
    );

    return this.repository.findConnectedServersByUserId(userId);
  }

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

  async disconnectFromServer(serverId: string): Promise<boolean> {
    const server = await this.repository.findConnectedServerById(serverId);
    if (!server) {
      return false;
    }

    try {
      await this.makeAuthenticatedRequest(
        server,
        '/api/federation/disconnect',
        { method: 'POST' },
      );
    } catch {}

    return this.repository.deleteConnectedServer(serverId);
  }

  private static readonly REQUEST_TIMEOUT = 30000;

  private getNetworkErrorMessage(error: unknown, url: string): string {
    if (!(error instanceof Error)) {
      return 'Unknown network error';
    }

    const message = error.message.toLowerCase();
    const cause = (error as any).cause;

    if (cause?.code) {
      switch (cause.code) {
        case 'ECONNREFUSED':
          return `Connection refused - server at ${new URL(url).host} is not accepting connections`;
        case 'ENOTFOUND':
          return `DNS lookup failed - cannot resolve hostname ${new URL(url).host}`;
        case 'ETIMEDOUT':
          return `Connection timed out - server at ${new URL(url).host} did not respond`;
        case 'ECONNRESET':
          return `Connection reset - server at ${new URL(url).host} closed the connection unexpectedly`;
        case 'EHOSTUNREACH':
          return `Host unreachable - cannot reach ${new URL(url).host}`;
        case 'ENETUNREACH':
          return `Network unreachable - no route to ${new URL(url).host}`;
        case 'CERT_HAS_EXPIRED':
          return `SSL certificate expired for ${new URL(url).host}`;
        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
        case 'SELF_SIGNED_CERT_IN_CHAIN':
          return `SSL certificate error - self-signed certificate for ${new URL(url).host}`;
        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
          return `SSL certificate error - cannot verify certificate for ${new URL(url).host}`;
        case 'ERR_TLS_CERT_ALTNAME_INVALID':
          return `SSL certificate error - hostname mismatch for ${new URL(url).host}`;
      }
    }

    if (message.includes('fetch failed')) {
      if (cause?.message) {
        return `Network error: ${cause.message}`;
      }
      return `Network error connecting to ${new URL(url).host} - check if server is online and accessible`;
    }

    if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
      return `SSL/TLS error connecting to ${new URL(url).host}`;
    }

    if (message.includes('timeout') || error.name === 'AbortError') {
      return `Request timed out after ${RemoteServerService.REQUEST_TIMEOUT / 1000}s`;
    }

    if (message.includes('network') || message.includes('socket')) {
      return `Network error: ${error.message}`;
    }

    return error.message;
  }

  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    return normalized;
  }

  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }
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

    this.validateUrl(url);

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
      const errorMessage = this.getNetworkErrorMessage(error, url);
      this.logger.debug(
        { url, originalError: error instanceof Error ? error.message : error, cause: (error as any)?.cause },
        'Network request failed with detailed info',
      );
      throw new HttpException(errorMessage, HttpStatus.BAD_GATEWAY);
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
