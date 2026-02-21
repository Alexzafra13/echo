import { FileScannerService } from './file-scanner.service';
import { PinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import type { Dirent, Stats } from 'fs';
import * as path from 'path';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

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
  });

  describe('scanDirectory', () => {
    it('should return empty array for empty directory', async () => {
      mockFs.readdir.mockResolvedValue([] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music');

      expect(result).toEqual([]);
    });

    it('should find mp3 files in directory', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'song.mp3', isDirectory: () => false, isFile: () => true },
        { name: 'document.txt', isDirectory: () => false, isFile: () => true },
      ] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music', false);

      expect(result).toEqual([p('/music', 'song.mp3')]);
    });

    it('should find all supported audio formats', async () => {
      const audioFiles = [
        { name: 'track.mp3', isDirectory: () => false, isFile: () => true },
        { name: 'track.flac', isDirectory: () => false, isFile: () => true },
        { name: 'track.m4a', isDirectory: () => false, isFile: () => true },
        { name: 'track.aac', isDirectory: () => false, isFile: () => true },
        { name: 'track.ogg', isDirectory: () => false, isFile: () => true },
        { name: 'track.opus', isDirectory: () => false, isFile: () => true },
        { name: 'track.wav', isDirectory: () => false, isFile: () => true },
        { name: 'track.wma', isDirectory: () => false, isFile: () => true },
        { name: 'track.ape', isDirectory: () => false, isFile: () => true },
      ];

      mockFs.readdir.mockResolvedValue(audioFiles as unknown as Dirent[]);

      const result = await service.scanDirectory('/music', false);

      expect(result).toHaveLength(9);
      expect(result).toContain(p('/music', 'track.mp3'));
      expect(result).toContain(p('/music', 'track.flac'));
      expect(result).toContain(p('/music', 'track.opus'));
    });

    it('should scan recursively by default', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([
          { name: 'song.mp3', isDirectory: () => false, isFile: () => true },
          { name: 'subdir', isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[])
        .mockResolvedValueOnce([
          { name: 'nested.flac', isDirectory: () => false, isFile: () => true },
        ] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music');

      expect(result).toContain(p('/music', 'song.mp3'));
      expect(result).toContain(p('/music', 'subdir', 'nested.flac'));
    });

    it('should not scan subdirectories when recursive is false', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'song.mp3', isDirectory: () => false, isFile: () => true },
        { name: 'subdir', isDirectory: () => true, isFile: () => false },
      ] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music', false);

      expect(result).toEqual([p('/music', 'song.mp3')]);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });

    it('should ignore non-music files', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'image.jpg', isDirectory: () => false, isFile: () => true },
        { name: 'document.pdf', isDirectory: () => false, isFile: () => true },
        { name: 'readme.txt', isDirectory: () => false, isFile: () => true },
        { name: '.DS_Store', isDirectory: () => false, isFile: () => true },
      ] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music', false);

      expect(result).toEqual([]);
    });

    it('should handle case-insensitive extensions', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'SONG.MP3', isDirectory: () => false, isFile: () => true },
        { name: 'Track.FLAC', isDirectory: () => false, isFile: () => true },
      ] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music', false);

      expect(result).toHaveLength(2);
    });

    it('should return empty array and log error when root directory is inaccessible', async () => {
      // The service catches errors in scanRecursive and continues, so it returns empty array
      mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await service.scanDirectory('/invalid');

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should skip inaccessible subdirectories and continue scanning', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([
          { name: 'song.mp3', isDirectory: () => false, isFile: () => true },
          { name: 'protected', isDirectory: () => true, isFile: () => false },
          { name: 'accessible', isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[])
        .mockRejectedValueOnce(new Error('EACCES: permission denied'))
        .mockResolvedValueOnce([
          { name: 'other.flac', isDirectory: () => false, isFile: () => true },
        ] as unknown as Dirent[]);

      const result = await service.scanDirectory('/music');

      expect(result).toContain(p('/music', 'song.mp3'));
      expect(result).toContain(p('/music', 'accessible', 'other.flac'));
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle deeply nested directory structures', async () => {
      mockFs.readdir
        .mockResolvedValueOnce([
          { name: 'level1', isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[])
        .mockResolvedValueOnce([
          { name: 'level2', isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[])
        .mockResolvedValueOnce([
          { name: 'level3', isDirectory: () => true, isFile: () => false },
        ] as unknown as Dirent[])
        .mockResolvedValueOnce([
          { name: 'deep.mp3', isDirectory: () => false, isFile: () => true },
        ] as unknown as Dirent[]);

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
