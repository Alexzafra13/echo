import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { Writable } from 'stream';
import { FilesystemService } from '@infrastructure/filesystem/filesystem.service';
import { NotFoundError } from '@shared/errors';
import {
  IAlbumRepository,
  ALBUM_REPOSITORY,
} from '@features/albums/domain/ports/album-repository.port';
import {
  ITrackRepository,
  TRACK_REPOSITORY,
} from '@features/tracks/domain/ports/track-repository.port';

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

@Injectable()
export class DownloadService {
  constructor(
    @InjectPinoLogger(DownloadService.name)
    private readonly logger: PinoLogger,
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
    private readonly filesystemService: FilesystemService
  ) {}

  async getAlbumDownloadInfo(albumId: string): Promise<AlbumDownloadInfo> {
    const album = await this.albumRepository.findById(albumId);

    if (!album) {
      throw new NotFoundError('Album', albumId);
    }

    const albumTracks = await this.trackRepository.findByAlbumId(albumId);

    if (albumTracks.length === 0) {
      throw new NotFoundError('Album tracks', albumId);
    }

    return {
      albumId: album.id,
      albumName: album.name,
      artistName: album.artistName || 'Unknown Artist',
      coverPath: album.coverArtPath || null,
      tracks: albumTracks.map((t) => ({
        id: t.id,
        title: t.title,
        path: t.path,
        trackNumber: t.trackNumber ?? null,
        discNumber: t.discNumber ?? null,
        suffix: t.suffix ?? null,
      })),
    };
  }

  // Genera ZIP del álbum respetando backpressure para evitar OOM
  async streamAlbumAsZip(albumInfo: AlbumDownloadInfo, outputStream: Writable): Promise<void> {
    // level 0 (store) — los archivos de audio ya están comprimidos,
    // comprimir de nuevo solo desperdicia CPU sin reducir tamaño.
    const archive = archiver('zip', {
      zlib: { level: 0 },
      highWaterMark: 1024 * 1024,
    });

    let aborted = false;

    outputStream.on('close', () => {
      if (!archive.closed) {
        aborted = true;
        archive.abort();
        this.logger.info(
          { albumId: albumInfo.albumId },
          'Client disconnected, aborting ZIP archive'
        );
      }
    });

    archive.on('error', (err: Error) => {
      this.logger.error(
        { error: err.message, albumId: albumInfo.albumId },
        'Error creating ZIP archive'
      );
      aborted = true;
    });

    archive.on('warning', (err: archiver.ArchiverError) => {
      if (err.code === 'ENOENT') {
        this.logger.warn(
          { error: err.message, albumId: albumInfo.albumId },
          'File not found during ZIP creation'
        );
      } else {
        this.logger.error({ error: err.message, albumId: albumInfo.albumId }, 'Archive warning');
      }
    });

    archive.pipe(outputStream);

    const folderName = this.sanitizeName(`${albumInfo.artistName} - ${albumInfo.albumName}`);

    const waitForDrain = (): Promise<void> => {
      return new Promise((resolve) => {
        outputStream.once('drain', resolve);
      });
    };

    if (albumInfo.coverPath && !aborted) {
      try {
        const safeCoverPath = this.filesystemService.validateMusicPath(albumInfo.coverPath);
        if (fs.existsSync(safeCoverPath)) {
          const coverExt = path.extname(safeCoverPath);
          archive.file(safeCoverPath, {
            name: `${folderName}/cover${coverExt}`,
          });
        }
      } catch {
        this.logger.warn(
          { path: albumInfo.coverPath },
          'Cover path rejected by security validation'
        );
      }
    }

    for (const track of albumInfo.tracks) {
      if (aborted) {
        this.logger.info({ albumId: albumInfo.albumId }, 'Aborting ZIP due to disconnect');
        break;
      }

      let safePath: string;
      try {
        safePath = this.filesystemService.validateMusicPath(track.path);
      } catch {
        this.logger.warn(
          { trackId: track.id, path: track.path },
          'Track path rejected by security validation, skipping'
        );
        continue;
      }

      if (!fs.existsSync(safePath)) {
        this.logger.warn({ trackId: track.id, path: safePath }, 'Track file not found, skipping');
        continue;
      }

      const trackNum = String(track.trackNumber || 0).padStart(2, '0');
      const discPrefix = track.discNumber && track.discNumber > 1 ? `${track.discNumber}-` : '';
      const safeTitle = this.sanitizeName(track.title);
      const ext = track.suffix || path.extname(safePath).slice(1) || 'mp3';
      const fileName = `${discPrefix}${trackNum} - ${safeTitle}.${ext}`;

      const fileStream = this.filesystemService.createReadStream(safePath);

      archive.append(fileStream, {
        name: `${folderName}/${fileName}`,
      });

      if (outputStream.writableNeedDrain) {
        await waitForDrain();
      }
    }

    if (!aborted) {
      await archive.finalize();

      this.logger.info(
        {
          albumId: albumInfo.albumId,
          albumName: albumInfo.albumName,
          trackCount: albumInfo.tracks.length,
        },
        'Album ZIP download completed'
      );
    }
  }

  async calculateAlbumSize(albumInfo: AlbumDownloadInfo): Promise<number> {
    const statPromises = albumInfo.tracks.map(async (track) => {
      try {
        const safePath = this.filesystemService.validateMusicPath(track.path);
        const stats = await fs.promises.stat(safePath);
        return stats.size;
      } catch {
        return 0;
      }
    });

    if (albumInfo.coverPath) {
      statPromises.push(
        (async () => {
          try {
            const safePath = this.filesystemService.validateMusicPath(albumInfo.coverPath!);
            const stats = await fs.promises.stat(safePath);
            return stats.size;
          } catch {
            return 0;
          }
        })()
      );
    }

    const sizes = await Promise.all(statPromises);
    return sizes.reduce((sum, size) => sum + size, 0);
  }

  private sanitizeName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.+$/g, '')
      .trim()
      .slice(0, 200);
  }
}
