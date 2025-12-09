import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ALBUM_REPOSITORY, IAlbumRepository } from '@features/albums/domain/ports/album-repository.port';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { IArchiveService, ARCHIVE_SERVICE, ArchiveFileEntry } from '@shared/services';
import { DownloadAlbumInput, DownloadAlbumOutput } from './download-album.dto';
import * as path from 'path';

/**
 * DownloadAlbumUseCase - Download all tracks from an album as a ZIP archive
 *
 * Responsibilities:
 * - Validate album exists
 * - Get all tracks for the album
 * - Create ZIP archive with all track files
 * - Return stream for download
 */
@Injectable()
export class DownloadAlbumUseCase {
  constructor(
    @InjectPinoLogger(DownloadAlbumUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
    @Inject(ARCHIVE_SERVICE)
    private readonly archiveService: IArchiveService,
  ) {}

  async execute(input: DownloadAlbumInput): Promise<DownloadAlbumOutput> {
    const { albumId } = input;

    // 1. Validate albumId
    if (!albumId || albumId.trim() === '') {
      throw new NotFoundException('Album ID is required');
    }

    // 2. Get album info
    const album = await this.albumRepository.findById(albumId);
    if (!album) {
      throw new NotFoundException(`Album with ID ${albumId} not found`);
    }

    // 3. Get all tracks for the album (exclude missing files)
    const tracks = await this.trackRepository.findByAlbumId(albumId, false);

    if (tracks.length === 0) {
      throw new NotFoundException(`Album ${albumId} has no available tracks`);
    }

    this.logger.info(
      { albumId, albumName: album.name, trackCount: tracks.length },
      'Preparing album download',
    );

    // 4. Prepare file entries for archive
    const files: ArchiveFileEntry[] = tracks
      .filter((track) => track.path) // Only tracks with valid paths
      .map((track) => {
        // Format: "01 - Track Title.mp3"
        const trackNumber = String(track.trackNumber || 0).padStart(2, '0');
        const extension = path.extname(track.path);
        const safeName = this.sanitizeFileName(track.title);
        const archiveName = `${trackNumber} - ${safeName}${extension}`;

        return {
          filePath: track.path,
          archiveName,
        };
      });

    if (files.length === 0) {
      throw new NotFoundException(`No valid track files found for album ${albumId}`);
    }

    // 5. Create archive name
    const safeAlbumName = this.sanitizeFileName(album.name);
    const safeArtistName = this.sanitizeFileName(album.artistName || 'Unknown Artist');
    const archiveName = `${safeArtistName} - ${safeAlbumName}`;

    // 6. Create archive stream
    const stream = this.archiveService.createArchiveStream(files, archiveName);

    // 7. Return result
    return {
      stream,
      fileName: `${archiveName}${this.archiveService.getExtension()}`,
      mimeType: this.archiveService.getMimeType(),
      trackCount: files.length,
    };
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}
