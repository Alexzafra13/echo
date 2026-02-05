import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { Writable } from 'stream';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { albums, tracks, artists } from '@infrastructure/database/schema';

export interface AlbumDownloadInfo {
  albumId: string;
  albumName: string;
  artistName: string;
  coverPath: string | null;
  tracks: {
    id: string;
    title: string;
    path: string;
    trackNumber: number | null;
    discNumber: number | null;
    suffix: string | null;
  }[];
}

/**
 * DownloadService - Service for handling file downloads
 *
 * Responsibilities:
 * - Get album information for ZIP download
 * - Stream album as ZIP file with proper structure
 */
@Injectable()
export class DownloadService {
  constructor(
    @InjectPinoLogger(DownloadService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
  ) {}

  /**
   * Get album information for download
   */
  async getAlbumDownloadInfo(albumId: string): Promise<AlbumDownloadInfo> {
    // Get album with artist
    const [album] = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        coverArtPath: albums.coverArtPath,
        artistName: artists.name,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.albumArtistId, artists.id))
      .where(eq(albums.id, albumId))
      .limit(1);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    // Get all tracks
    const albumTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
        trackNumber: tracks.trackNumber,
        discNumber: tracks.discNumber,
        suffix: tracks.suffix,
      })
      .from(tracks)
      .where(eq(tracks.albumId, albumId))
      .orderBy(tracks.discNumber, tracks.trackNumber);

    if (albumTracks.length === 0) {
      throw new NotFoundException('Album has no tracks');
    }

    return {
      albumId: album.id,
      albumName: album.name,
      artistName: album.artistName || 'Unknown Artist',
      coverPath: album.coverArtPath,
      tracks: albumTracks,
    };
  }

  /**
   * Stream album as ZIP file with backpressure support
   * Prevents OOM when client reads slowly by respecting stream backpressure
   */
  async streamAlbumAsZip(
    albumInfo: AlbumDownloadInfo,
    outputStream: Writable,
  ): Promise<void> {
    // Use smaller highWaterMark to reduce memory usage
    const archive = archiver('zip', {
      zlib: { level: 0 }, // No compression for audio files (already compressed)
      highWaterMark: 1024 * 1024, // 1MB buffer instead of default 16KB
    });

    // Track if we've been aborted
    let aborted = false;

    // Handle client disconnect
    outputStream.on('close', () => {
      if (!archive.closed) {
        aborted = true;
        archive.abort();
        this.logger.info(
          { albumId: albumInfo.albumId },
          'Client disconnected, aborting ZIP archive',
        );
      }
    });

    // Handle archive errors - don't throw, just log and abort
    archive.on('error', (err: Error) => {
      this.logger.error(
        { error: err.message, albumId: albumInfo.albumId },
        'Error creating ZIP archive',
      );
      aborted = true;
    });

    archive.on('warning', (err: archiver.ArchiverError) => {
      if (err.code === 'ENOENT') {
        this.logger.warn(
          { error: err.message, albumId: albumInfo.albumId },
          'File not found during ZIP creation',
        );
      } else {
        this.logger.error(
          { error: err.message, albumId: albumInfo.albumId },
          'Archive warning',
        );
      }
    });

    // Pipe archive to output stream
    archive.pipe(outputStream);

    // Create folder structure: ArtistName - AlbumName/
    const folderName = this.sanitizeFolderName(
      `${albumInfo.artistName} - ${albumInfo.albumName}`,
    );

    // Helper to wait for drain when backpressure occurs
    const waitForDrain = (): Promise<void> => {
      return new Promise((resolve) => {
        outputStream.once('drain', resolve);
      });
    };

    // Add cover if exists
    if (albumInfo.coverPath && fs.existsSync(albumInfo.coverPath) && !aborted) {
      const coverExt = path.extname(albumInfo.coverPath);
      archive.file(albumInfo.coverPath, {
        name: `${folderName}/cover${coverExt}`,
      });
    }

    // Add tracks one by one, respecting backpressure
    for (const track of albumInfo.tracks) {
      // Check if we should abort
      if (aborted) {
        this.logger.info({ albumId: albumInfo.albumId }, 'Aborting ZIP due to disconnect');
        break;
      }

      if (!fs.existsSync(track.path)) {
        this.logger.warn(
          { trackId: track.id, path: track.path },
          'Track file not found, skipping',
        );
        continue;
      }

      // Build filename: "01 - Title.flac" or "1-01 - Title.flac" for multi-disc
      const trackNum = String(track.trackNumber || 0).padStart(2, '0');
      const discPrefix =
        track.discNumber && track.discNumber > 1
          ? `${track.discNumber}-`
          : '';
      const safeTitle = this.sanitizeFileName(track.title);
      const ext = track.suffix || path.extname(track.path).slice(1) || 'mp3';
      const fileName = `${discPrefix}${trackNum} - ${safeTitle}.${ext}`;

      // Use stream instead of file path for better backpressure handling
      const fileStream = fs.createReadStream(track.path, {
        highWaterMark: 64 * 1024, // 64KB chunks
      });

      archive.append(fileStream, {
        name: `${folderName}/${fileName}`,
      });

      // Wait for drain if the output buffer is full (backpressure)
      if (outputStream.writableNeedDrain) {
        await waitForDrain();
      }
    }

    // Finalize archive if not aborted
    if (!aborted) {
      await archive.finalize();

      this.logger.info(
        {
          albumId: albumInfo.albumId,
          albumName: albumInfo.albumName,
          trackCount: albumInfo.tracks.length,
        },
        'Album ZIP download completed',
      );
    }
  }

  /**
   * Calculate estimated ZIP size (sum of file sizes)
   */
  async calculateAlbumSize(albumInfo: AlbumDownloadInfo): Promise<number> {
    // Stat all files in parallel for better performance
    const statPromises = albumInfo.tracks.map(async (track) => {
      try {
        const stats = await fs.promises.stat(track.path);
        return stats.size;
      } catch {
        return 0;
      }
    });

    // Add cover size if exists
    if (albumInfo.coverPath) {
      statPromises.push(
        fs.promises.stat(albumInfo.coverPath).then(s => s.size).catch(() => 0),
      );
    }

    const sizes = await Promise.all(statPromises);
    return sizes.reduce((sum, size) => sum + size, 0);
  }

  /**
   * Sanitize folder name for filesystem
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars
      .replace(/\.+$/g, '') // Remove trailing dots
      .trim()
      .slice(0, 200); // Limit length
  }

  /**
   * Sanitize file name for filesystem
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars
      .replace(/\.+$/g, '') // Remove trailing dots
      .trim()
      .slice(0, 200); // Limit length
  }
}
