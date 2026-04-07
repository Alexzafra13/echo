import { Test, TestingModule } from '@nestjs/testing';
import { DownloadController } from './download.controller';
import { DownloadService } from '../infrastructure/services/download.service';
import { StreamTokenGuard } from './guards';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { FastifyReply } from 'fastify';

describe('DownloadController', () => {
  let controller: DownloadController;
  let mockDownloadService: {
    getAlbumDownloadInfo: jest.Mock;
    calculateAlbumSize: jest.Mock;
    streamAlbumAsZip: jest.Mock;
  };

  const mockAlbumInfo = {
    albumId: 'album-123',
    albumName: 'Test Album',
    artistName: 'Test Artist',
    tracks: [
      { id: 'track-1', title: 'Song 1', filePath: '/music/song1.mp3' },
      { id: 'track-2', title: 'Song 2', filePath: '/music/song2.mp3' },
    ],
  };

  const createMockResponse = () => {
    const raw = {
      writeHead: jest.fn(),
      writableEnded: false,
      end: jest.fn(),
    };
    return { raw } as unknown as FastifyReply;
  };

  beforeEach(async () => {
    mockDownloadService = {
      getAlbumDownloadInfo: jest.fn().mockResolvedValue(mockAlbumInfo),
      calculateAlbumSize: jest.fn().mockResolvedValue(10485760), // 10 MB
      streamAlbumAsZip: jest.fn().mockResolvedValue(undefined),
    };

    const mockLogger = createMockPinoLogger();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [
        {
          provide: DownloadService,
          useValue: mockDownloadService,
        },
        {
          provide: `PinoLogger:${DownloadController.name}`,
          useValue: mockLogger,
        },
      ],
    })
      .overrideGuard(StreamTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DownloadController>(DownloadController);
  });

  describe('downloadAlbum', () => {
    it('should retrieve album info and stream as ZIP', async () => {
      const res = createMockResponse();

      await controller.downloadAlbum('album-123', res);

      expect(mockDownloadService.getAlbumDownloadInfo).toHaveBeenCalledWith('album-123');
      expect(mockDownloadService.calculateAlbumSize).toHaveBeenCalledWith(mockAlbumInfo);
      expect(mockDownloadService.streamAlbumAsZip).toHaveBeenCalledWith(mockAlbumInfo, res.raw);
    });

    it('should set correct response headers', async () => {
      const res = createMockResponse();

      await controller.downloadAlbum('album-123', res);

      expect(res.raw.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': expect.stringContaining('Test%20Artist%20-%20Test%20Album'),
        'Transfer-Encoding': 'chunked',
        'X-Estimated-Size': '10485760',
      });
    });

    it('should sanitize filename by removing special characters', async () => {
      mockDownloadService.getAlbumDownloadInfo.mockResolvedValue({
        ...mockAlbumInfo,
        artistName: 'Artist <with> "special"',
        albumName: 'Album: test/name',
      });

      const res = createMockResponse();
      await controller.downloadAlbum('album-123', res);

      const contentDisposition = res.raw.writeHead.mock.calls[0][1]['Content-Disposition'];
      // Should not contain < > : " / \ | ? *
      const filename = decodeURIComponent(
        contentDisposition.replace('attachment; filename="', '').replace('"', '')
      );
      expect(filename).not.toMatch(/[<>:"/\\|?*]/);
    });

    it('should end response when streaming fails', async () => {
      mockDownloadService.streamAlbumAsZip.mockRejectedValue(new Error('Stream error'));
      const res = createMockResponse();

      await controller.downloadAlbum('album-123', res);

      expect(res.raw.end).toHaveBeenCalled();
    });

    it('should not end response if already ended', async () => {
      mockDownloadService.streamAlbumAsZip.mockRejectedValue(new Error('Stream error'));
      const res = createMockResponse();
      res.raw.writableEnded = true;

      await controller.downloadAlbum('album-123', res);

      expect(res.raw.end).not.toHaveBeenCalled();
    });
  });
});
