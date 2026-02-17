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

@Injectable()
export class DownloadService {
  constructor(
    @InjectPinoLogger(DownloadService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
  ) {}

  async getAlbumDownloadInfo(albumId: string): Promise<AlbumDownloadInfo> {
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

  // Genera ZIP del álbum respetando backpressure para evitar OOM
  async streamAlbumAsZip(
    albumInfo: AlbumDownloadInfo,
    outputStream: Writable,
  ): Promise<void> {
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
          'Client disconnected, aborting ZIP archive',
        );
      }
    });

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

    archive.pipe(outputStream);

    const folderName = this.sanitizeFolderName(
      `${albumInfo.artistName} - ${albumInfo.albumName}`,
    );

    const waitForDrain = (): Promise<void> => {
      return new Promise((resolve) => {
        outputStream.once('drain', resolve);
      });
    };

    if (albumInfo.coverPath && fs.existsSync(albumInfo.coverPath) && !aborted) {
      const coverExt = path.extname(albumInfo.coverPath);
      archive.file(albumInfo.coverPath, {
        name: `${folderName}/cover${coverExt}`,
      });
    }

    for (const track of albumInfo.tracks) {
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

      const trackNum = String(track.trackNumber || 0).padStart(2, '0');
      const discPrefix =
        track.discNumber && track.discNumber > 1
          ? `${track.discNumber}-`
          : '';
      const safeTitle = this.sanitizeFileName(track.title);
      const ext = track.suffix || path.extname(track.path).slice(1) || 'mp3';
      const fileName = `${discPrefix}${trackNum} - ${safeTitle}.${ext}`;

      const fileStream = fs.createReadStream(track.path, {
        highWaterMark: 64 * 1024,
      });

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
        'Album ZIP download completed',
      );
    }
  }

  async calculateAlbumSize(albumInfo: AlbumDownloadInfo): Promise<number> {
    const statPromises = albumInfo.tracks.map(async (track) => {
      try {
        const stats = await fs.promises.stat(track.path);
        return stats.size;
      } catch {
        return 0;
      }
    });

    if (albumInfo.coverPath) {
      statPromises.push(
        fs.promises.stat(albumInfo.coverPath).then(s => s.size).catch(() => 0),
      );
    }

    const sizes = await Promise.all(statPromises);
    return sizes.reduce((sum, size) => sum + size, 0);
  }

  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.+$/g, '')
      .trim()
      .slice(0, 200);
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.+$/g, '')
      .trim()
      .slice(0, 200);
  }
}
