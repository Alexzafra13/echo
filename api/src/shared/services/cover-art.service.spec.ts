import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CoverArtService } from './cover-art.service';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { parseFile } from 'music-metadata';
import * as path from 'path';

// Mock modules
jest.mock('fs/promises');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));
// music-metadata is mocked via moduleNameMapper in jest.config.js

describe('CoverArtService', () => {
  let service: CoverArtService;
  let configService: ConfigService;

  // Helper to create cross-platform paths
  const p = (...segments: string[]) => path.join(...segments);

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default config mock
    mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'COVERS_PATH') return p('/test', 'covers');
      if (key === 'DATA_PATH') return undefined;
      if (key === 'UPLOAD_PATH') return defaultValue;
      return defaultValue;
    });

    // Mock existsSync for directory check
    (existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverArtService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CoverArtService>(CoverArtService);
  });

  describe('initialization', () => {
    it('should use COVERS_PATH if provided', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'COVERS_PATH') return p('/custom', 'covers');
        return undefined;
      });

      // Service uses the path from config
      expect(mockConfigService.get).toHaveBeenCalledWith('COVERS_PATH');
    });

    it('should fallback to DATA_PATH/uploads/covers', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'COVERS_PATH') return undefined;
        if (key === 'DATA_PATH') return '/data';
        return undefined;
      });

      (existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CoverArtService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      module.get<CoverArtService>(CoverArtService);

      expect(mockConfigService.get).toHaveBeenCalledWith('DATA_PATH');
    });

    it('should create covers directory if not exists', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CoverArtService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      module.get<CoverArtService>(CoverArtService);

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(fs.mkdir).toHaveBeenCalledWith(p('/test', 'covers'), { recursive: true });
    });
  });

  describe('extractAndCacheCover', () => {
    it('should find and cache external cover first', async () => {
      const albumId = 'album-123';
      const trackPath = p('/music', 'album', 'track.mp3');

      // External cover exists - need to match how the service checks for cover.jpg
      const expectedCoverPath = p('/music', 'album', 'cover.jpg');
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        // Normalize paths for comparison
        const normalizedCheck = path.normalize(checkPath);
        const normalizedExpected = path.normalize(expectedCoverPath);
        const normalizedCovers = path.normalize(p('/test', 'covers'));
        return normalizedCheck === normalizedExpected || normalizedCheck === normalizedCovers;
      });
      (fs.copyFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.extractAndCacheCover(albumId, trackPath);

      expect(result).toBe('album-123.jpg');
      expect(fs.copyFile).toHaveBeenCalled();
    });

    it('should extract embedded cover if no external found', async () => {
      const albumId = 'album-456';
      const trackPath = p('/music', 'album', 'track.mp3');

      // No external cover - only covers directory exists
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        return path.normalize(checkPath) === path.normalize(p('/test', 'covers'));
      });

      // Mock embedded cover
      (parseFile as jest.Mock).mockResolvedValue({
        common: {
          picture: [
            {
              data: Buffer.from('fake-image-data'),
              format: 'image/jpeg',
            },
          ],
        },
      });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.extractAndCacheCover(albumId, trackPath);

      expect(result).toBe('album-456.jpg');
      expect(parseFile).toHaveBeenCalledWith(trackPath);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return undefined if no cover found', async () => {
      const albumId = 'album-789';
      const trackPath = p('/music', 'album', 'track.mp3');

      // No external cover
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        return path.normalize(checkPath) === path.normalize(p('/test', 'covers'));
      });

      // No embedded cover
      (parseFile as jest.Mock).mockResolvedValue({
        common: {},
      });

      const result = await service.extractAndCacheCover(albumId, trackPath);

      expect(result).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const albumId = 'album-error';
      const trackPath = p('/music', 'album', 'track.mp3');

      (existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = await service.extractAndCacheCover(albumId, trackPath);

      expect(result).toBeUndefined();
    });
  });

  describe('getCoverPath', () => {
    it('should return full path if cover exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = service.getCoverPath('album-123.jpg');

      expect(result).toBe(p('/test', 'covers', 'album-123.jpg'));
    });

    it('should return undefined if cover does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = service.getCoverPath('album-missing.jpg');

      expect(result).toBeUndefined();
    });

    it('should return undefined for null/undefined input', () => {
      expect(service.getCoverPath(null)).toBeUndefined();
      expect(service.getCoverPath(undefined)).toBeUndefined();
    });
  });

  describe('coverExists', () => {
    it('should return true if cover exists', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.coverExists('album-123.jpg');

      expect(result).toBe(true);
    });

    it('should return false if cover does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.coverExists('album-missing.jpg');

      expect(result).toBe(false);
    });

    it('should return false for null/undefined input', async () => {
      expect(await service.coverExists(null)).toBe(false);
      expect(await service.coverExists(undefined)).toBe(false);
    });
  });

  describe('deleteCover', () => {
    it('should delete cover if it exists', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteCover('album-123.jpg');

      expect(fs.unlink).toHaveBeenCalledWith(p('/test', 'covers', 'album-123.jpg'));
    });

    it('should not throw if cover does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deleteCover('album-missing.jpg')).resolves.not.toThrow();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.deleteCover('album-123.jpg')).resolves.not.toThrow();
    });
  });

  describe('mimeTypeToExtension (via cacheCoverFromBuffer)', () => {
    beforeEach(() => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should handle image/jpeg', async () => {
      // No external cover
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        return path.normalize(checkPath) === path.normalize(p('/test', 'covers'));
      });
      (parseFile as jest.Mock).mockResolvedValue({
        common: {
          picture: [{ data: Buffer.from('data'), format: 'image/jpeg' }],
        },
      });

      const result = await service.extractAndCacheCover('test', '/track.mp3');
      expect(result).toBe('test.jpg');
    });

    it('should handle image/png', async () => {
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        return path.normalize(checkPath) === path.normalize(p('/test', 'covers'));
      });
      (parseFile as jest.Mock).mockResolvedValue({
        common: {
          picture: [{ data: Buffer.from('data'), format: 'image/png' }],
        },
      });

      const result = await service.extractAndCacheCover('test', '/track.mp3');
      expect(result).toBe('test.png');
    });

    it('should handle image/webp', async () => {
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        return path.normalize(checkPath) === path.normalize(p('/test', 'covers'));
      });
      (parseFile as jest.Mock).mockResolvedValue({
        common: {
          picture: [{ data: Buffer.from('data'), format: 'image/webp' }],
        },
      });

      const result = await service.extractAndCacheCover('test', '/track.mp3');
      expect(result).toBe('test.webp');
    });

    it('should default to .jpg for unknown mime types', async () => {
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        return path.normalize(checkPath) === path.normalize(p('/test', 'covers'));
      });
      (parseFile as jest.Mock).mockResolvedValue({
        common: {
          picture: [{ data: Buffer.from('data'), format: 'image/unknown' }],
        },
      });

      const result = await service.extractAndCacheCover('test', '/track.mp3');
      expect(result).toBe('test.jpg');
    });
  });

  describe('copyFileWithRetry', () => {
    it('should retry on EPERM errors', async () => {
      const albumId = 'retry-test';
      const trackPath = p('/music', 'album', 'track.mp3');
      const expectedCoverPath = p('/music', 'album', 'cover.jpg');

      // External cover exists
      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        const normalizedCheck = path.normalize(checkPath);
        return normalizedCheck === path.normalize(expectedCoverPath) ||
               normalizedCheck === path.normalize(p('/test', 'covers'));
      });

      // Fail twice with EPERM, then succeed
      let callCount = 0;
      (fs.copyFile as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('EPERM') as NodeJS.ErrnoException;
          error.code = 'EPERM';
          return Promise.reject(error);
        }
        return Promise.resolve();
      });

      const result = await service.extractAndCacheCover(albumId, trackPath);

      expect(result).toBe('retry-test.jpg');
      expect(fs.copyFile).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const albumId = 'fail-test';
      const trackPath = p('/music', 'album', 'track.mp3');
      const expectedCoverPath = p('/music', 'album', 'cover.jpg');

      (existsSync as jest.Mock).mockImplementation((checkPath: string) => {
        const normalizedCheck = path.normalize(checkPath);
        return normalizedCheck === path.normalize(expectedCoverPath) ||
               normalizedCheck === path.normalize(p('/test', 'covers'));
      });

      // Always fail with EPERM
      (fs.copyFile as jest.Mock).mockImplementation(() => {
        const error = new Error('EPERM') as NodeJS.ErrnoException;
        error.code = 'EPERM';
        return Promise.reject(error);
      });

      const result = await service.extractAndCacheCover(albumId, trackPath);

      // Should gracefully return undefined after all retries fail
      expect(result).toBeUndefined();
    });
  });
});
