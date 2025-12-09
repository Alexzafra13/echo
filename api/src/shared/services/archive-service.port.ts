import { Readable } from 'stream';

/**
 * FileEntry - Represents a file to be added to an archive
 */
export interface ArchiveFileEntry {
  /** File path on disk */
  filePath: string;
  /** Name for the file inside the archive (can include subdirectories) */
  archiveName: string;
}

/**
 * IArchiveService - Contract for creating archive files (ZIP, TAR, etc.)
 * Implementation can be swapped without affecting consumers
 */
export interface IArchiveService {
  /**
   * Creates an archive from multiple files and returns a readable stream
   * @param files - Array of files to include in the archive
   * @param archiveName - Name for the archive (without extension)
   * @returns Readable stream of the archive data
   */
  createArchiveStream(files: ArchiveFileEntry[], archiveName: string): Readable;

  /**
   * Gets the MIME type for the archive format
   * @returns MIME type string
   */
  getMimeType(): string;

  /**
   * Gets the file extension for the archive format
   * @returns Extension including dot (e.g., '.zip')
   */
  getExtension(): string;
}

export const ARCHIVE_SERVICE = 'IArchiveService';
