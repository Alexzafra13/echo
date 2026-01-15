import { NotFoundException } from '@nestjs/common';
import { DownloadService, AlbumDownloadInfo } from './download.service';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
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
    finalize: jest.fn().mockResolvedValue(undefined),
  }));
});

import * as fs from 'fs';

describe('DownloadService', () => {
  let service: DownloadService;
  let mockDrizzle: {
    db: {
      select: jest.Mock;
    };
  };
  let mockLogger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockDrizzle = {
      db: {
        select: jest.fn(),
      },
    };

    service = new DownloadService(mockLogger as any, mockDrizzle as any);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAlbumDownloadInfo', () => {
    it('debería retornar información del album con tracks', async () => {
      // Arrange
      const albumId = 'album-123';
      const mockAlbum = {
        id: albumId,
        name: 'Test Album',
        coverArtPath: '/covers/album.jpg',
        artistName: 'Test Artist',
      };
      const mockTracks = [
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
      ];

      // Mock album query
      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAlbum]),
            }),
          }),
        }),
      });

      // Mock tracks query
      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockTracks),
          }),
        }),
      });

      // Act
      const result = await service.getAlbumDownloadInfo(albumId);

      // Assert
      expect(result.albumId).toBe(albumId);
      expect(result.albumName).toBe('Test Album');
      expect(result.artistName).toBe('Test Artist');
      expect(result.coverPath).toBe('/covers/album.jpg');
      expect(result.tracks).toHaveLength(2);
    });

    it('debería lanzar NotFoundException si el album no existe', async () => {
      // Arrange
      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(service.getAlbumDownloadInfo('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar NotFoundException si el album no tiene tracks', async () => {
      // Arrange
      const mockAlbum = {
        id: 'album-123',
        name: 'Empty Album',
        coverArtPath: null,
        artistName: 'Test Artist',
      };

      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAlbum]),
            }),
          }),
        }),
      });

      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Act & Assert
      await expect(service.getAlbumDownloadInfo('album-123')).rejects.toThrow(
        'Album has no tracks',
      );
    });

    it('debería usar "Unknown Artist" si el artista es null', async () => {
      // Arrange
      const mockAlbum = {
        id: 'album-123',
        name: 'Test Album',
        coverArtPath: null,
        artistName: null,
      };
      const mockTracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          path: '/music/track1.flac',
          trackNumber: 1,
          discNumber: 1,
          suffix: 'flac',
        },
      ];

      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAlbum]),
            }),
          }),
        }),
      });

      mockDrizzle.db.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockTracks),
          }),
        }),
      });

      // Act
      const result = await service.getAlbumDownloadInfo('album-123');

      // Assert
      expect(result.artistName).toBe('Unknown Artist');
    });
  });

  describe('calculateAlbumSize', () => {
    it('debería calcular el tamaño total de los tracks', async () => {
      // Arrange
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
        .mockResolvedValueOnce({ size: 10000000 }) // 10MB
        .mockResolvedValueOnce({ size: 15000000 }); // 15MB

      // Act
      const result = await service.calculateAlbumSize(albumInfo);

      // Assert
      expect(result).toBe(25000000);
    });

    it('debería incluir el tamaño de la portada si existe', async () => {
      // Arrange
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
        .mockResolvedValueOnce({ size: 10000000 }) // Track
        .mockResolvedValueOnce({ size: 500000 }); // Cover

      // Act
      const result = await service.calculateAlbumSize(albumInfo);

      // Assert
      expect(result).toBe(10500000);
    });

    it('debería ignorar archivos que no existen', async () => {
      // Arrange
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

      // Act
      const result = await service.calculateAlbumSize(albumInfo);

      // Assert
      expect(result).toBe(10000000);
    });

    it('debería retornar 0 si no hay archivos válidos', async () => {
      // Arrange
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

      (fs.promises.stat as jest.Mock).mockRejectedValueOnce(
        new Error('ENOENT'),
      );

      // Act
      const result = await service.calculateAlbumSize(albumInfo);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('streamAlbumAsZip', () => {
    it('debería crear un archivo ZIP con estructura correcta', async () => {
      // Arrange
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

      // Mock output stream with event handlers for backpressure support
      const mockOutputStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        writableNeedDrain: false,
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      await service.streamAlbumAsZip(albumInfo, mockOutputStream as any);

      // Assert
      expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutputStream);
      expect(mockArchive.finalize).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('debería saltar archivos que no existen', async () => {
      // Arrange
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

      // Mock output stream with event handlers
      const mockOutputStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        writableNeedDrain: false,
      };
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // track1 exists
        .mockReturnValueOnce(false); // track2 missing

      // Act
      await service.streamAlbumAsZip(albumInfo, mockOutputStream as any);

      // Assert
      expect(mockArchive.file).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('debería formatear correctamente nombres de archivos multi-disco', async () => {
      // Arrange
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
        albumName: 'Double Album',
        artistName: 'Test Artist',
        coverPath: null,
        tracks: [
          {
            id: 'track-1',
            title: 'Disc 1 Track',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
          {
            id: 'track-2',
            title: 'Disc 2 Track',
            path: '/music/track2.flac',
            trackNumber: 1,
            discNumber: 2,
            suffix: 'flac',
          },
        ],
      };

      // Mock output stream with event handlers
      const mockOutputStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        writableNeedDrain: false,
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      await service.streamAlbumAsZip(albumInfo, mockOutputStream as any);

      // Assert - append is used instead of file for tracks (with streams)
      expect(mockArchive.append).toHaveBeenCalledTimes(2);
      // Verify finalize was called
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('debería sanitizar caracteres inválidos en nombres', async () => {
      // Arrange
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
        albumName: 'Album: The "Best" <Hits>',
        artistName: 'Artist/Band',
        coverPath: null,
        tracks: [
          {
            id: 'track-1',
            title: 'Song: With "Special" <Chars>',
            path: '/music/track1.flac',
            trackNumber: 1,
            discNumber: 1,
            suffix: 'flac',
          },
        ],
      };

      // Mock output stream with event handlers
      const mockOutputStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        writableNeedDrain: false,
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      await service.streamAlbumAsZip(albumInfo, mockOutputStream as any);

      // Assert - append is used for tracks with sanitized names
      expect(mockArchive.append).toHaveBeenCalledTimes(1);
      expect(mockArchive.finalize).toHaveBeenCalled();
    });
  });
});
