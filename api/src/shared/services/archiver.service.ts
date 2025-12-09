import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Readable } from 'stream';
import archiver from 'archiver';
import * as fs from 'fs';
import { IArchiveService, ArchiveFileEntry } from './archive-service.port';

/**
 * ArchiverService - ZIP archive implementation using 'archiver' library
 *
 * Creates ZIP archives with streaming support for efficient memory usage.
 * Can be replaced with another implementation (yazl, adm-zip, etc.)
 * without affecting consumers.
 */
@Injectable()
export class ArchiverService implements IArchiveService {
  constructor(
    @InjectPinoLogger(ArchiverService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Creates a ZIP archive stream from multiple files
   * Uses streaming to avoid loading all files into memory
   */
  createArchiveStream(files: ArchiveFileEntry[], archiveName: string): Readable {
    this.logger.info(
      { archiveName, fileCount: files.length },
      'Creating ZIP archive stream',
    );

    // Create archiver instance with ZIP format and compression
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Balanced compression (0-9)
    });

    // Handle archive errors
    archive.on('error', (err: Error) => {
      this.logger.error(
        { error: err.message, archiveName },
        'Archive creation error',
      );
      throw err;
    });

    // Log when archive is finalized
    archive.on('end', () => {
      this.logger.info(
        { archiveName, totalBytes: archive.pointer() },
        'Archive finalized',
      );
    });

    // Add each file to the archive
    for (const file of files) {
      if (fs.existsSync(file.filePath)) {
        // Stream file directly into archive (memory efficient)
        archive.file(file.filePath, { name: file.archiveName });
        this.logger.debug(
          { filePath: file.filePath, archiveName: file.archiveName },
          'Added file to archive',
        );
      } else {
        this.logger.warn(
          { filePath: file.filePath },
          'File not found, skipping',
        );
      }
    }

    // Finalize the archive (no more files can be added after this)
    archive.finalize();

    return archive;
  }

  getMimeType(): string {
    return 'application/zip';
  }

  getExtension(): string {
    return '.zip';
  }
}
