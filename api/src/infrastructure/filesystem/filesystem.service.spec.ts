import { FilesystemService } from './filesystem.service';
import { ForbiddenException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
  promises: {
    readdir: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

describe('FilesystemService', () => {
  let service: FilesystemService;
  let mockLogger: jest.Mocked<PinoLogger>;
  const originalEnv = process.env;

  const p = (...segments: string[]) => path.join(...segments);

  const createMockLogger = (): jest.Mocked<PinoLogger> =>
    ({
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      assign: jest.fn(),
    }) as unknown as jest.Mocked<PinoLogger>;

  const createService = () => new FilesystemService(mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    process.env = { ...originalEnv };
    process.env.DATA_PATH = p('/test', 'data');
    process.env.LIBRARY_PATH = p('/music');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use DATA_PATH from environment', () => {
      process.env.DATA_PATH = p('/custom', 'data');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service = createService();

      expect(service.getUploadPath()).toBe(p('/custom', 'data', 'uploads'));
      expect(service.getCoversPath()).toBe(p('/custom', 'data', 'covers'));
    });

    it('should use default path when DATA_PATH is not set', () => {
      delete process.env.DATA_PATH;
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service = createService();

      expect(service.getUploadPath()).toBe(p('/app', 'data', 'uploads'));
      expect(service.getCoversPath()).toBe(p('/app', 'data', 'covers'));
    });

    it('should create directories if they do not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      service = createService();

      expect(fs.mkdirSync).toHaveBeenCalledWith(p('/test', 'data', 'uploads'), {
        recursive: true,
      });
      expect(fs.mkdirSync).toHaveBeenCalledWith(p('/test', 'data', 'covers'), {
        recursive: true,
      });
    });

    it('should not create directories if they already exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service = createService();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => createService()).not.toThrow();
    });
  });

  describe('readDirectory', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should return list of files in directory within allowed path', async () => {
      const files = ['file1.txt', 'file2.txt', 'subdir'];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(files);

      const result = await service.readDirectory(p('/test', 'data', 'covers'));

      expect(result).toEqual(files);
      expect(fs.promises.readdir).toHaveBeenCalledWith(p('/test', 'data', 'covers'));
    });

    it('should reject paths outside allowed directories', async () => {
      await expect(service.readDirectory('/etc/passwd')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('fileExists', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should return true if file exists within allowed path', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      const result = await service.fileExists(p('/test', 'data', 'file.txt'));

      expect(result).toBe(true);
    });

    it('should return false if file does not exist within allowed path', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await service.fileExists(p('/test', 'data', 'nonexistent.txt'));

      expect(result).toBe(false);
    });

    it('should reject path traversal attempts', async () => {
      await expect(
        service.fileExists(p('/test', 'data', '..', '..', 'etc', 'passwd'))
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFileStats', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should return file stats for allowed paths', async () => {
      const mockStats = {
        size: 1024,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      const filePath = p('/test', 'data', 'file.txt');
      const result = await service.getFileStats(filePath);

      expect(result).toEqual(mockStats);
      expect(fs.promises.stat).toHaveBeenCalledWith(filePath);
    });

    it('should reject paths outside allowed directories', async () => {
      await expect(service.getFileStats('/etc/shadow')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createReadStream', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should create read stream without range for allowed paths', () => {
      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const filePath = p('/music', 'file.mp3');
      const result = service.createReadStream(filePath);

      expect(result).toBe(mockStream);
      expect(fs.createReadStream).toHaveBeenCalledWith(filePath, {
        start: undefined,
        end: undefined,
      });
    });

    it('should create read stream with byte range', () => {
      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const filePath = p('/music', 'file.mp3');
      const result = service.createReadStream(filePath, 0, 1023);

      expect(result).toBe(mockStream);
      expect(fs.createReadStream).toHaveBeenCalledWith(filePath, {
        start: 0,
        end: 1023,
      });
    });

    it('should reject path traversal in createReadStream', () => {
      expect(() => service.createReadStream('/etc/passwd')).toThrow(ForbiddenException);
    });
  });

  describe('path traversal protection', () => {
    beforeEach(() => {
      service = createService();
    });

    it('should allow paths within DATA_PATH', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      const result = await service.fileExists(p('/test', 'data', 'uploads', 'avatar.jpg'));
      expect(result).toBe(true);
    });

    it('should allow paths within LIBRARY_PATH', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      const result = await service.fileExists(p('/music', 'album', 'track.flac'));
      expect(result).toBe(true);
    });

    it('should block paths outside allowed roots', async () => {
      await expect(service.fileExists('/tmp/malicious')).rejects.toThrow(ForbiddenException);
    });

    it('should block dot-dot traversal even if it starts within allowed path', async () => {
      await expect(
        service.fileExists(p('/test', 'data', '..', '..', 'etc', 'passwd'))
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUploadPath', () => {
    it('should return upload path', () => {
      service = createService();
      expect(service.getUploadPath()).toBe(p('/test', 'data', 'uploads'));
    });
  });

  describe('getCoversPath', () => {
    it('should return covers path', () => {
      service = createService();
      expect(service.getCoversPath()).toBe(p('/test', 'data', 'covers'));
    });
  });
});
