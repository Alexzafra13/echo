import { Writable, Readable } from 'stream';
import { PinoLogger } from 'nestjs-pino';
import { DownloadService, AlbumDownloadInfo } from './download.service';
import { NotFoundError } from '@shared/errors';
import { IAlbumRepository } from '@features/albums/domain/ports/album-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { Album } from '@features/albums/domain/entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn(),
    destroy: jest.fn(),
  })),
  promises: {
    stat: jest.fn(),
  },
}));

// Mock archiver
jest.mock('archiver', () => {
  return jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn(),
    file: jest.fn(),
    append: jest.fn(),
    abort: jest.fn(),
    finalize: jest.fn().mockResolvedValue(undefined),
    closed: false,
  }));
});

import * as fs from 'fs';

// Helpers para crear mocks de entidades
const createMockAlbum = (
  overrides: Partial<{
    id: string;
    name: string;
    artistName: string | null;
    coverArtPath: string | null;
  }> = {}
) =>
  ({
    id: overrides.id ?? 'album-123',
    name: overrides.name ?? 'Test Album',
    artistName: 'artistName' in overrides ? overrides.artistName : 'Test Artist',
    coverArtPath: overrides.coverArtPath ?? null,
  }) as unknown as Album;

const createMockTrack = (
  overrides: Partial<{
    id: string;
    title: string;
    path: string;
    trackNumber: number;
    discNumber: number;
    suffix: string;
  }>
) =>
  ({
    id: overrides.id ?? 'track-1',
    title: overrides.title ?? 'Track 1',
    path: overrides.path ?? '/music/track1.flac',
    trackNumber: overrides.trackNumber ?? 1,
    discNumber: overrides.discNumber ?? 1,
    suffix: overrides.suffix ?? 'flac',
  }) as unknown as Track;

describe('DownloadService', () => {
  let service: DownloadService;
  let mockAlbumRepository: jest.Mocked<Pick<IAlbumRepository, 'findById'>>;
  let mockTrackRepository: jest.Mocked<Pick<ITrackRepository, 'findByAlbumId'>>;
  let mockLogger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockAlbumRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<Pick<IAlbumRepository, 'findById'>>;

    mockTrackRepository = {
      findByAlbumId: jest.fn(),
    } as unknown as jest.Mocked<Pick<ITrackRepository, 'findByAlbumId'>>;

    const mockFilesystemService = {
      validateMusicPath: jest.fn((p: string) => p),
      createReadStream: jest.fn(() => {
        return new Readable({
          read() {
            this.push(null);
          },
        });
      }),
    };

    service = new DownloadService(
      mockLogger as unknown as PinoLogger,
      mockAlbumRepository as unknown as IAlbumRepository,
      mockTrackRepository as unknown as ITrackRepository,
      mockFilesystemService as never
    );

    jest.clearAllMocks();
  });

  describe('getAlbumDownloadInfo', () => {
    it('debería retornar información del album con tracks', async () => {
      const album = createMockAlbum({ coverArtPath: '/covers/album.jpg' });
      const trackList = [
        createMockTrack({ id: 'track-1', title: 'Track 1', trackNumber: 1 }),
        createMockTrack({ id: 'track-2', title: 'Track 2', trackNumber: 2 }),
      ];

      (mockAlbumRepository.findById as jest.Mock).mockResolvedValue(album);
      (mockTrackRepository.findByAlbumId as jest.Mock).mockResolvedValue(trackList);

      const result = await service.getAlbumDownloadInfo('album-123');

      expect(result.albumId).toBe('album-123');
      expect(result.albumName).toBe('Test Album');
      expect(result.artistName).toBe('Test Artist');
      expect(result.tracks).toHaveLength(2);
    });

    it('debería lanzar NotFoundError si el album no existe', async () => {
      (mockAlbumRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getAlbumDownloadInfo('invalid-id')).rejects.toThrow(NotFoundError);
    });

    it('debería lanzar NotFoundError si el album no tiene tracks', async () => {
      const album = createMockAlbum();
      (mockAlbumRepository.findById as jest.Mock).mockResolvedValue(album);
      (mockTrackRepository.findByAlbumId as jest.Mock).mockResolvedValue([]);

      await expect(service.getAlbumDownloadInfo('album-123')).rejects.toThrow(NotFoundError);
    });

    it('debería usar "Unknown Artist" si el artista es null', async () => {
      const album = createMockAlbum({ artistName: null as unknown as string });
      const trackList = [createMockTrack({})];

      (mockAlbumRepository.findById as jest.Mock).mockResolvedValue(album);
      (mockTrackRepository.findByAlbumId as jest.Mock).mockResolvedValue(trackList);

      const result = await service.getAlbumDownloadInfo('album-123');

      expect(result.artistName).toBe('Unknown Artist');
    });
  });

  describe('calculateAlbumSize', () => {
    it('debería calcular el tamaño total de los tracks', async () => {
      const albumInfo: AlbumDownloadInfo = {
        albumId: 'album-123',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        coverPath: null,
        tracks: [
          {
            id: 'track-1',
            title: 'Track 1',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
          {
            id: 'track-2',
            title: 'Track 2',
            path: '/music/track2.flac',
            trackNumber: 2,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      (fs.promises.stat as jest.Mock)
        .mockResolvedValueOnce({ size: 10000000 })
        .mockResolvedValueOnce({ size: 15000000 });

      const result = await service.calculateAlbumSize(albumInfo);

      expect(result).toBe(25000000);
    });

    it('debería incluir el tamaño de la portada si existe', async () => {
      const albumInfo: AlbumDownloadInfo = {
        albumId: 'album-123',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        coverPath: '/covers/album.jpg',
        tracks: [
          {
            id: 'track-1',
            title: 'Track 1',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      (fs.promises.stat as jest.Mock)
        .mockResolvedValueOnce({ size: 10000000 })
        .mockResolvedValueOnce({ size: 500000 });

      const result = await service.calculateAlbumSize(albumInfo);

      expect(result).toBe(10500000);
    });

    it('debería ignorar archivos que no existen', async () => {
      const albumInfo: AlbumDownloadInfo = {
        albumId: 'album-123',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        coverPath: '/covers/missing.jpg',
        tracks: [
          {
            id: 'track-1',
            title: 'Track 1',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
          {
            id: 'track-2',
            title: 'Track 2',
            path: '/music/missing.flac',
            trackNumber: 2,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      (fs.promises.stat as jest.Mock)
        .mockResolvedValueOnce({ size: 10000000 })
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'));

      const result = await service.calculateAlbumSize(albumInfo);

      expect(result).toBe(10000000);
    });

    it('debería retornar 0 si no hay archivos válidos', async () => {
      const albumInfo: AlbumDownloadInfo = {
        albumId: 'album-123',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        coverPath: null,
        tracks: [
          {
            id: 'track-1',
            title: 'Track 1',
            path: '/music/missing.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      (fs.promises.stat as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await service.calculateAlbumSize(albumInfo);

      expect(result).toBe(0);
    });
  });

  describe('streamAlbumAsZip', () => {
    it('debería crear un archivo ZIP y finalizar', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const archiver = require('archiver');
      const mockArchive = {
        on: jest.fn(),
        pipe: jest.fn(),
        file: jest.fn(),
        append: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
        closed: false,
        abort: jest.fn(),
      };
      archiver.mockReturnValue(mockArchive);

      const albumInfo: AlbumDownloadInfo = {
        albumId: 'album-123',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        coverPath: '/covers/album.jpg',
        tracks: [
          {
            id: 'track-1',
            title: 'Track 1',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      const mockOutputStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        writableNeedDrain: false,
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.streamAlbumAsZip(albumInfo, mockOutputStream as unknown as Writable);

      expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutputStream);
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('debería saltar archivos que no existen', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const archiver = require('archiver');
      const mockArchive = {
        on: jest.fn(),
        pipe: jest.fn(),
        file: jest.fn(),
        append: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
        closed: false,
        abort: jest.fn(),
      };
      archiver.mockReturnValue(mockArchive);

      const albumInfo: AlbumDownloadInfo = {
        albumId: 'album-123',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        coverPath: null,
        tracks: [
          {
            id: 'track-1',
            title: 'Track 1',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
          {
            id: 'track-2',
            title: 'Track 2',
            path: '/music/missing.flac',
            trackNumber: 2,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      const mockOutputStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        writableNeedDrain: false,
      };
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

      await service.streamAlbumAsZip(albumInfo, mockOutputStream as unknown as Writable);

      expect(mockArchive.append).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
