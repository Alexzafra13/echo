import { FilesystemService } from './filesystem.service';
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
  const originalEnv = process.env;

  // Helper to create cross-platform paths
  const p = (...segments: string[]) => path.join(...segments);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    process.env.DATA_PATH = p('/test', 'data');

    // Default: directories exist
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use DATA_PATH from environment', () => {
      process.env.DATA_PATH = p('/custom', 'data');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service = new FilesystemService();

      expect(service.getUploadPath()).toBe(p('/custom', 'data', 'uploads'));
      expect(service.getCoversPath()).toBe(p('/custom', 'data', 'covers'));
    });

    it('should use default path when DATA_PATH is not set', () => {
      delete process.env.DATA_PATH;
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service = new FilesystemService();

      expect(service.getUploadPath()).toBe(p('/app', 'data', 'uploads'));
      expect(service.getCoversPath()).toBe(p('/app', 'data', 'covers'));
    });

    it('should create directories if they do not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      service = new FilesystemService();

      expect(fs.mkdirSync).toHaveBeenCalledWith(p('/test', 'data', 'uploads'), {
        recursive: true,
      });
      expect(fs.mkdirSync).toHaveBeenCalledWith(p('/test', 'data', 'covers'), {
        recursive: true,
      });
    });

    it('should not create directories if they already exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service = new FilesystemService();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw
      expect(() => new FilesystemService()).not.toThrow();
    });
  });

  describe('readDirectory', () => {
    beforeEach(() => {
      service = new FilesystemService();
    });

    it('should return list of files in directory', async () => {
      const files = ['file1.txt', 'file2.txt', 'subdir'];
      (fs.promises.readdir as jest.Mock).mockResolvedValue(files);

      const result = await service.readDirectory('/test/dir');

      expect(result).toEqual(files);
      expect(fs.promises.readdir).toHaveBeenCalledWith('/test/dir');
    });

    it('should propagate errors from fs.readdir', async () => {
      (fs.promises.readdir as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );

      await expect(service.readDirectory('/nonexistent')).rejects.toThrow(
        'ENOENT',
      );
    });
  });

  describe('fileExists', () => {
    beforeEach(() => {
      service = new FilesystemService();
    });

    it('should return true if file exists', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      const result = await service.fileExists('/test/file.txt');

      expect(result).toBe(true);
      expect(fs.promises.access).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false if file does not exist', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(
        new Error('ENOENT'),
      );

      const result = await service.fileExists('/nonexistent/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('getFileStats', () => {
    beforeEach(() => {
      service = new FilesystemService();
    });

    it('should return file stats', async () => {
      const mockStats = {
        size: 1024,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      const result = await service.getFileStats('/test/file.txt');

      expect(result).toEqual(mockStats);
      expect(fs.promises.stat).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should propagate errors for non-existent files', async () => {
      (fs.promises.stat as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );

      await expect(service.getFileStats('/nonexistent')).rejects.toThrow(
        'ENOENT',
      );
    });
  });

  describe('createReadStream', () => {
    beforeEach(() => {
      service = new FilesystemService();
    });

    it('should create read stream without range', () => {
      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const result = service.createReadStream('/test/file.mp3');

      expect(result).toBe(mockStream);
      expect(fs.createReadStream).toHaveBeenCalledWith('/test/file.mp3', {
        start: undefined,
        end: undefined,
      });
    });

    it('should create read stream with byte range', () => {
      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const result = service.createReadStream('/test/file.mp3', 0, 1023);

      expect(result).toBe(mockStream);
      expect(fs.createReadStream).toHaveBeenCalledWith('/test/file.mp3', {
        start: 0,
        end: 1023,
      });
    });

    it('should handle partial range (start only)', () => {
      const mockStream = { pipe: jest.fn() };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

      const result = service.createReadStream('/test/file.mp3', 500);

      expect(fs.createReadStream).toHaveBeenCalledWith('/test/file.mp3', {
        start: 500,
        end: undefined,
      });
    });
  });

  describe('getUploadPath', () => {
    it('should return upload path', () => {
      service = new FilesystemService();

      expect(service.getUploadPath()).toBe(p('/test', 'data', 'uploads'));
    });
  });

  describe('getCoversPath', () => {
    it('should return covers path', () => {
      service = new FilesystemService();

      expect(service.getCoversPath()).toBe(p('/test', 'data', 'covers'));
    });
  });
});
