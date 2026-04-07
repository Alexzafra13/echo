import { FileScannerService } from './file-scanner.service';
import { PinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import type { Dirent, Stats } from 'fs';

type ReaddirResult = Dirent<Buffer<ArrayBuffer>>[];
import * as path from 'path';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

// Helper to create mock Dirent entries with all required methods
function mockDirent(
  name: string,
  opts: { isDir?: boolean; isFile?: boolean; isSymlink?: boolean } = {}
) {
  return {
    name,
    isDirectory: () => opts.isDir ?? false,
    isFile: () => opts.isFile ?? false,
    isSymbolicLink: () => opts.isSymlink ?? false,
  };
}

describe('FileScannerService', () => {
  let service: FileScannerService;
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  // Helper to create cross-platform paths
  const p = (...segments: string[]) => path.join(...segments);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    service = new FileScannerService(mockLogger as unknown as PinoLogger);

    // Default: realpath resolves to the same path (no symlinks)
    mockFs.realpath.mockImplementation((p) => Promise.resolve(p as string));
  });

  describe('scanDirectory', () => {
    it('should return empty array for empty directory', async () => {
      mockFs.readdir.mockResolvedValue([] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music');

      expect(result).toEqual([]);
    });

    it('should find mp3 files in directory', async () => {
      mockFs.readdir.mockResolvedValue([
        mockDirent('song.mp3', { isFile: true }),
        mockDirent('document.txt', { isFile: true }),
      ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music', false);

      expect(result).toEqual([p('/music', 'song.mp3')]);
    });

    it('should find all supported audio formats', async () => {
      const audioFiles = [
        mockDirent('track.mp3', { isFile: true }),
        mockDirent('track.flac', { isFile: true }),
        mockDirent('track.m4a', { isFile: true }),
        mockDirent('track.aac', { isFile: true }),
        mockDirent('track.ogg', { isFile: true }),
        mockDirent('track.opus', { isFile: true }),
        mockDirent('track.wav', { isFile: true }),
        mockDirent('track.wma', { isFile: true }),
        mockDirent('track.ape', { isFile: true }),
      ];

      mockFs.readdir.mockResolvedValue(audioFiles as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music', false);

      expect(result).toHaveLength(9);
      expect(result).toContain(p('/music', 'track.mp3'));
      expect(result).toContain(p('/music', 'track.flac'));
      expect(result).toContain(p('/music', 'track.opus'));
    });

    it('should scan recursively by default', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([
          mockDirent('song.mp3', { isFile: true }),
          mockDirent('subdir', { isDir: true }),
        ] as unknown as ReaddirResult)
        .mockResolvedValueOnce([
          mockDirent('nested.flac', { isFile: true }),
        ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music');

      expect(result).toContain(p('/music', 'song.mp3'));
      expect(result).toContain(p('/music', 'subdir', 'nested.flac'));
    });

    it('should not scan subdirectories when recursive is false', async () => {
      mockFs.readdir.mockResolvedValue([
        mockDirent('song.mp3', { isFile: true }),
        mockDirent('subdir', { isDir: true }),
      ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music', false);

      expect(result).toEqual([p('/music', 'song.mp3')]);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });

    it('should ignore non-music files', async () => {
      mockFs.readdir.mockResolvedValue([
        mockDirent('image.jpg', { isFile: true }),
        mockDirent('document.pdf', { isFile: true }),
        mockDirent('readme.txt', { isFile: true }),
        mockDirent('.DS_Store', { isFile: true }),
      ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music', false);

      expect(result).toEqual([]);
    });

    it('should handle case-insensitive extensions', async () => {
      mockFs.readdir.mockResolvedValue([
        mockDirent('SONG.MP3', { isFile: true }),
        mockDirent('Track.FLAC', { isFile: true }),
      ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music', false);

      expect(result).toHaveLength(2);
    });

    it('should return empty array and log error when root directory is inaccessible', async () => {
      mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await service.scanDirectory('/invalid');

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should skip inaccessible subdirectories and continue scanning', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([
          mockDirent('song.mp3', { isFile: true }),
          mockDirent('protected', { isDir: true }),
          mockDirent('accessible', { isDir: true }),
        ] as unknown as ReaddirResult)
        .mockRejectedValueOnce(new Error('EACCES: permission denied'))
        .mockResolvedValueOnce([
          mockDirent('other.flac', { isFile: true }),
        ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music');

      expect(result).toContain(p('/music', 'song.mp3'));
      expect(result).toContain(p('/music', 'accessible', 'other.flac'));
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle deeply nested directory structures', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([mockDirent('level1', { isDir: true })] as unknown as ReaddirResult)
        .mockResolvedValueOnce([mockDirent('level2', { isDir: true })] as unknown as ReaddirResult)
        .mockResolvedValueOnce([mockDirent('level3', { isDir: true })] as unknown as ReaddirResult)
        .mockResolvedValueOnce([
          mockDirent('deep.mp3', { isFile: true }),
        ] as unknown as ReaddirResult);

      const result = await service.scanDirectory('/music');

      expect(result).toContain(p('/music', 'level1', 'level2', 'level3', 'deep.mp3'));
    });
  });

  describe('getFileExtension', () => {
    it('should return extension without dot', () => {
      expect(service.getFileExtension('song.mp3')).toBe('mp3');
    });

    it('should return extension in lowercase', () => {
      expect(service.getFileExtension('SONG.FLAC')).toBe('flac');
    });

    it('should handle multiple dots in filename', () => {
      expect(service.getFileExtension('my.song.name.m4a')).toBe('m4a');
    });

    it('should return empty string for files without extension', () => {
      expect(service.getFileExtension('noextension')).toBe('');
    });

    it('should handle full paths', () => {
      expect(service.getFileExtension('/path/to/music/song.ogg')).toBe('ogg');
    });
  });

  describe('pathExists', () => {
    it('should return true when path exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.pathExists('/music/song.mp3');

      expect(result).toBe(true);
    });

    it('should return false when path does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await service.pathExists('/nonexistent/file.mp3');

      expect(result).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file stats when file exists', async () => {
      const mockStats = {
        size: 1024000,
        mtime: new Date('2024-01-15'),
        isFile: () => true,
        isDirectory: () => false,
      };
      mockFs.stat.mockResolvedValue(mockStats as unknown as Stats);

      const result = await service.getFileStats('/music/song.mp3');

      expect(result).toEqual(mockStats);
    });

    it('should return null when file does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await service.getFileStats('/nonexistent.mp3');

      expect(result).toBeNull();
    });
  });
});
