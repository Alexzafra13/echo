import { Readable } from 'stream';

/**
 * Input DTO for DownloadAlbumUseCase
 */
export interface DownloadAlbumInput {
  albumId: string;
}

/**
 * Output DTO for DownloadAlbumUseCase
 */
export interface DownloadAlbumOutput {
  /** Readable stream of the ZIP archive */
  stream: Readable;
  /** Filename for Content-Disposition header */
  fileName: string;
  /** MIME type of the archive */
  mimeType: string;
  /** Number of tracks in the archive */
  trackCount: number;
}
