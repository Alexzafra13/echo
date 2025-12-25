import { Injectable, Inject, forwardRef, ConflictException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, and, ilike } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { albums, artists, tracks, settings } from '@infrastructure/database/schema';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../../domain/ports/federation.repository';
import { AlbumImportQueue, ConnectedServer } from '../../domain/types';
import { FederationGateway } from '../../presentation/federation.gateway';

/**
 * Metadata for album export from remote server
 */
export interface ExportedAlbumMetadata {
  album: {
    id: string;
    name: string;
    artistName: string;
    artistId: string | null;
    year: number | null;
    releaseDate: string | null;
    originalDate: string | null;
    compilation: boolean;
    songCount: number;
    duration: number;
    size: number;
    hasCover: boolean;
    coverUrl: string | null;
    mbzAlbumId: string | null;
    mbzAlbumArtistId: string | null;
    mbzAlbumType: string | null;
    catalogNum: string | null;
    comment: string | null;
    description: string | null;
  };
  tracks: ExportedTrackMetadata[];
}

export interface ExportedTrackMetadata {
  id: string;
  title: string;
  trackNumber: number | null;
  discNumber: number | null;
  discSubtitle: string | null;
  duration: number | null;
  size: number | null;
  bitRate: number | null;
  channels: number | null;
  suffix: string | null;
  year: number | null;
  date: string | null;
  originalDate: string | null;
  releaseDate: string | null;
  artistName: string | null;
  albumArtistName: string | null;
  comment: string | null;
  lyrics: string | null;
  bpm: number | null;
  // ReplayGain/LUFS
  rgAlbumGain: number | null;
  rgAlbumPeak: number | null;
  rgTrackGain: number | null;
  rgTrackPeak: number | null;
  lufsAnalyzed: boolean;
  // MusicBrainz
  mbzTrackId: string | null;
  mbzAlbumId: string | null;
  mbzArtistId: string | null;
  mbzAlbumArtistId: string | null;
  mbzReleaseTrackId: string | null;
  catalogNum: string | null;
  // File info
  filename: string;
  streamUrl: string;
}

/**
 * Progress event emitted during import
 */
export interface AlbumImportProgressEvent {
  importId: string;
  userId: string;
  albumName: string;
  artistName: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number; // 0-100
  currentTrack: number;
  totalTracks: number;
  downloadedSize: number;
  totalSize: number;
  error?: string;
}

/**
 * AlbumImportService - Service for importing albums from federated servers
 *
 * Responsibilities:
 * - Fetch album metadata from remote server
 * - Download track files to local music library
 * - Create artist/album/track records in database
 * - Preserve LUFS/ReplayGain data to skip re-analysis
 * - Emit progress events via WebSocket
 */
@Injectable()
export class AlbumImportService {
  constructor(
    @InjectPinoLogger(AlbumImportService.name)
    private readonly logger: PinoLogger,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
    private readonly drizzle: DrizzleService,
    @Inject(forwardRef(() => FederationGateway))
    private readonly federationGateway: FederationGateway,
  ) {}

  /**
   * Start importing an album from a connected server
   */
  async startImport(
    userId: string,
    server: ConnectedServer,
    remoteAlbumId: string,
  ): Promise<AlbumImportQueue> {
    // 1. Get album metadata from remote server
    const metadata = await this.fetchAlbumMetadata(server, remoteAlbumId);

    // 2. Check for duplicate - album with same name and artist already exists
    const existingAlbum = await this.checkForDuplicateAlbum(
      metadata.album.name,
      metadata.album.artistName,
    );

    if (existingAlbum) {
      this.logger.warn(
        { albumName: metadata.album.name, artistName: metadata.album.artistName },
        'Album already exists in library',
      );
      throw new ConflictException(
        `El álbum "${metadata.album.name}" de "${metadata.album.artistName}" ya existe en tu biblioteca`,
      );
    }

    // 3. Check for existing pending import of the same album from same server
    const existingImport = await this.checkForPendingImport(
      userId,
      server.id,
      remoteAlbumId,
    );

    if (existingImport) {
      this.logger.warn(
        { importId: existingImport.id, albumName: metadata.album.name },
        'Import already in progress',
      );
      throw new ConflictException(
        `Ya hay una importación en progreso para "${metadata.album.name}"`,
      );
    }

    // 4. Create import queue entry
    const importEntry = await this.repository.createAlbumImport({
      userId,
      connectedServerId: server.id,
      remoteAlbumId,
      albumName: metadata.album.name,
      artistName: metadata.album.artistName,
      status: 'pending',
      progress: 0,
      totalTracks: metadata.tracks.length,
      downloadedTracks: 0,
      totalSize: metadata.album.size,
      downloadedSize: 0,
    });

    this.logger.info(
      { importId: importEntry.id, albumName: metadata.album.name },
      'Album import queued',
    );

    // 3. Start import process in background
    this.processImport(importEntry.id, server, metadata).catch((error) => {
      this.logger.error(
        { importId: importEntry.id, error: error instanceof Error ? error.message : error },
        'Album import failed',
      );
    });

    return importEntry;
  }

  /**
   * Get import status
   */
  async getImportStatus(importId: string): Promise<AlbumImportQueue | null> {
    return this.repository.findAlbumImportById(importId);
  }

  /**
   * Get all imports for a user
   */
  async getUserImports(userId: string): Promise<AlbumImportQueue[]> {
    return this.repository.findAlbumImportsByUserId(userId);
  }

  /**
   * Cancel a pending import
   */
  async cancelImport(importId: string): Promise<boolean> {
    const importEntry = await this.repository.findAlbumImportById(importId);
    if (!importEntry || importEntry.status !== 'pending') {
      return false;
    }

    await this.repository.updateAlbumImportStatus(importId, 'cancelled');
    return true;
  }

  // ============================================
  // Private methods
  // ============================================

  /**
   * Check if an album with the same name and artist already exists
   */
  private async checkForDuplicateAlbum(
    albumName: string,
    artistName: string,
  ): Promise<{ id: string } | null> {
    const [existing] = await this.drizzle.db
      .select({ id: albums.id })
      .from(albums)
      .innerJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(
        and(
          ilike(albums.name, albumName),
          ilike(artists.name, artistName),
        ),
      )
      .limit(1);

    return existing ?? null;
  }

  /**
   * Check if there's already a pending/downloading import for this album
   */
  private async checkForPendingImport(
    userId: string,
    serverId: string,
    remoteAlbumId: string,
  ): Promise<AlbumImportQueue | null> {
    const userImports = await this.repository.findAlbumImportsByUserId(userId);

    const pendingImport = userImports.find(
      (imp) =>
        imp.connectedServerId === serverId &&
        imp.remoteAlbumId === remoteAlbumId &&
        (imp.status === 'pending' || imp.status === 'downloading'),
    );

    return pendingImport ?? null;
  }

  /**
   * Fetch album metadata from remote server
   */
  private async fetchAlbumMetadata(
    server: ConnectedServer,
    albumId: string,
  ): Promise<ExportedAlbumMetadata> {
    const url = `${server.baseUrl}/api/federation/albums/${albumId}/export`;

    this.logger.info(
      { serverId: server.id, albumId, url },
      'Fetching album metadata from remote server',
    );

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${server.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        this.logger.error(
          { serverId: server.id, albumId, status: response.status, error: errorText },
          'Failed to fetch album metadata from remote server',
        );
        throw new Error(`Failed to fetch album metadata: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Failed to fetch album metadata')) {
        throw error;
      }
      // Network error or other fetch failure
      this.logger.error(
        { serverId: server.id, albumId, error: error instanceof Error ? error.message : error },
        'Network error fetching album metadata',
      );
      throw new Error(`Cannot connect to remote server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process the album import (runs in background)
   */
  private async processImport(
    importId: string,
    server: ConnectedServer,
    metadata: ExportedAlbumMetadata,
  ): Promise<void> {
    const importEntry = await this.repository.findAlbumImportById(importId);
    if (!importEntry) {
      throw new Error('Import entry not found');
    }

    try {
      // Update status to downloading
      await this.repository.updateAlbumImportStatus(importId, 'downloading');
      this.emitProgress(importEntry, 'downloading', 0, 0);

      // 1. Get music library path
      const musicPath = await this.getMusicLibraryPath();
      if (!musicPath) {
        throw new Error('Music library path not configured');
      }

      // 2. Create folder structure: /music/{Artist}/{Album}/
      const artistFolder = this.sanitizeFolderName(metadata.album.artistName);
      const albumFolder = this.sanitizeFolderName(metadata.album.name);
      const albumPath = path.join(musicPath, artistFolder, albumFolder);

      await fs.mkdir(albumPath, { recursive: true });

      this.logger.info(
        { importId, albumPath },
        'Created album folder',
      );

      // 3. Find or create artist
      const artistId = await this.findOrCreateArtist(metadata.album.artistName);

      // 4. Create album record
      const albumId = await this.createAlbumRecord(metadata.album, artistId, albumPath);

      // 5. Download cover if available
      if (metadata.album.hasCover && metadata.album.coverUrl) {
        await this.downloadCover(server, metadata.album.coverUrl, albumPath, albumId);
      }

      // 6. Download tracks one by one
      let downloadedTracks = 0;
      let downloadedSize = 0;

      for (const track of metadata.tracks) {
        const trackPath = await this.downloadTrack(
          server,
          track,
          albumPath,
          albumId,
          artistId,
          metadata.album,
        );

        downloadedTracks++;
        downloadedSize += track.size || 0;

        // Update progress
        const progress = Math.round((downloadedTracks / metadata.tracks.length) * 100);
        await this.repository.updateAlbumImport(importId, {
          progress,
          downloadedTracks,
          downloadedSize,
        });

        this.emitProgress(
          { ...importEntry, progress, downloadedTracks, downloadedSize },
          'downloading',
          downloadedTracks,
          downloadedSize,
        );

        this.logger.debug(
          { importId, track: track.title, progress },
          'Track downloaded',
        );
      }

      // 7. Mark as completed
      await this.repository.updateAlbumImportStatus(importId, 'completed');
      this.emitProgress(
        { ...importEntry, progress: 100, downloadedTracks, downloadedSize },
        'completed',
        downloadedTracks,
        downloadedSize,
      );

      this.logger.info(
        { importId, albumName: metadata.album.name },
        'Album import completed',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.repository.updateAlbumImportStatus(importId, 'failed', errorMessage);
      this.emitProgress(
        importEntry,
        'failed',
        importEntry.downloadedTracks,
        importEntry.downloadedSize,
        errorMessage,
      );
      throw error;
    }
  }

  /**
   * Get music library path from settings
   */
  private async getMusicLibraryPath(): Promise<string | null> {
    const [setting] = await this.drizzle.db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'library.music.path'))
      .limit(1);

    return setting?.value || null;
  }

  /**
   * Find existing artist or create new one
   */
  private async findOrCreateArtist(artistName: string): Promise<string> {
    // Try to find existing artist
    const [existing] = await this.drizzle.db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.name, artistName))
      .limit(1);

    if (existing) {
      return existing.id;
    }

    // Create new artist
    const [newArtist] = await this.drizzle.db
      .insert(artists)
      .values({
        name: artistName,
        orderArtistName: artistName.toLowerCase(),
      })
      .returning({ id: artists.id });

    return newArtist.id;
  }

  /**
   * Create album record in database
   */
  private async createAlbumRecord(
    albumMeta: ExportedAlbumMetadata['album'],
    artistId: string,
    albumPath: string,
  ): Promise<string> {
    const [newAlbum] = await this.drizzle.db
      .insert(albums)
      .values({
        name: albumMeta.name,
        albumArtistId: artistId,
        artistId: artistId,
        year: albumMeta.year,
        releaseDate: albumMeta.releaseDate,
        originalDate: albumMeta.originalDate,
        compilation: albumMeta.compilation,
        songCount: albumMeta.songCount,
        duration: albumMeta.duration,
        size: albumMeta.size,
        mbzAlbumId: albumMeta.mbzAlbumId,
        mbzAlbumArtistId: albumMeta.mbzAlbumArtistId,
        mbzAlbumType: albumMeta.mbzAlbumType,
        catalogNum: albumMeta.catalogNum,
        comment: albumMeta.comment,
        description: albumMeta.description,
        orderAlbumName: albumMeta.name.toLowerCase(),
        sortAlbumName: albumMeta.name,
      })
      .returning({ id: albums.id });

    return newAlbum.id;
  }

  /**
   * Download cover image from remote server
   */
  private async downloadCover(
    server: ConnectedServer,
    coverUrl: string,
    albumPath: string,
    albumId: string,
  ): Promise<void> {
    try {
      const fullUrl = `${server.baseUrl}${coverUrl}`;
      const response = await fetch(fullUrl, {
        headers: {
          Authorization: `Bearer ${server.authToken}`,
        },
      });

      if (!response.ok) {
        this.logger.warn({ coverUrl, status: response.status }, 'Failed to download cover');
        return;
      }

      const coverPath = path.join(albumPath, 'cover.jpg');
      const fileStream = fsSync.createWriteStream(coverPath);

      // Node 18+ compatibility
      const body = response.body as unknown as Readable;
      await pipeline(body, fileStream);

      // Update album with cover path
      await this.drizzle.db
        .update(albums)
        .set({ coverArtPath: coverPath })
        .where(eq(albums.id, albumId));

      this.logger.debug({ albumId, coverPath }, 'Cover downloaded');
    } catch (error) {
      this.logger.warn(
        { error: error instanceof Error ? error.message : error },
        'Failed to download cover, continuing without it',
      );
    }
  }

  /**
   * Download a single track from remote server
   */
  private async downloadTrack(
    server: ConnectedServer,
    trackMeta: ExportedTrackMetadata,
    albumPath: string,
    albumId: string,
    artistId: string,
    albumMeta: ExportedAlbumMetadata['album'],
  ): Promise<string> {
    // Build filename: "01 - Title.flac"
    const trackNum = String(trackMeta.trackNumber || 0).padStart(2, '0');
    const safeTitle = this.sanitizeFileName(trackMeta.title);
    const extension = trackMeta.suffix || 'mp3';
    const filename = `${trackNum} - ${safeTitle}.${extension}`;
    const trackPath = path.join(albumPath, filename);

    // Download the track file
    const streamUrl = `${server.baseUrl}${trackMeta.streamUrl}`;
    const response = await fetch(streamUrl, {
      headers: {
        Authorization: `Bearer ${server.authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download track: ${response.status}`);
    }

    const fileStream = fsSync.createWriteStream(trackPath);
    const body = response.body as unknown as Readable;
    await pipeline(body, fileStream);

    // Create track record with all metadata including LUFS/ReplayGain
    await this.drizzle.db.insert(tracks).values({
      title: trackMeta.title,
      albumId,
      artistId,
      albumArtistId: artistId,
      trackNumber: trackMeta.trackNumber,
      discNumber: trackMeta.discNumber || 1,
      discSubtitle: trackMeta.discSubtitle,
      duration: trackMeta.duration,
      size: trackMeta.size,
      bitRate: trackMeta.bitRate,
      channels: trackMeta.channels,
      suffix: trackMeta.suffix,
      year: trackMeta.year,
      date: trackMeta.date,
      originalDate: trackMeta.originalDate,
      releaseDate: trackMeta.releaseDate,
      artistName: trackMeta.artistName,
      albumArtistName: trackMeta.albumArtistName || albumMeta.artistName,
      albumName: albumMeta.name,
      comment: trackMeta.comment,
      lyrics: trackMeta.lyrics,
      bpm: trackMeta.bpm,
      path: trackPath,
      // ReplayGain/LUFS - preserve from source server!
      rgAlbumGain: trackMeta.rgAlbumGain,
      rgAlbumPeak: trackMeta.rgAlbumPeak,
      rgTrackGain: trackMeta.rgTrackGain,
      rgTrackPeak: trackMeta.rgTrackPeak,
      lufsAnalyzedAt: trackMeta.lufsAnalyzed ? new Date() : null, // Mark as analyzed if source had it
      // MusicBrainz IDs
      mbzTrackId: trackMeta.mbzTrackId,
      mbzAlbumId: trackMeta.mbzAlbumId,
      mbzArtistId: trackMeta.mbzArtistId,
      mbzAlbumArtistId: trackMeta.mbzAlbumArtistId,
      mbzReleaseTrackId: trackMeta.mbzReleaseTrackId,
      catalogNum: trackMeta.catalogNum,
    });

    return trackPath;
  }

  /**
   * Emit progress event via WebSocket gateway
   */
  private emitProgress(
    importEntry: AlbumImportQueue,
    status: 'downloading' | 'completed' | 'failed',
    currentTrack: number,
    downloadedSize: number,
    error?: string,
  ): void {
    const event: AlbumImportProgressEvent = {
      importId: importEntry.id,
      userId: importEntry.userId,
      albumName: importEntry.albumName,
      artistName: importEntry.artistName || 'Unknown Artist',
      status,
      progress: importEntry.progress,
      currentTrack,
      totalTracks: importEntry.totalTracks,
      downloadedSize,
      totalSize: importEntry.totalSize,
      error,
    };

    this.federationGateway.emitProgress(event);
  }

  /**
   * Sanitize folder name for filesystem
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Sanitize file name for filesystem
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }
}
