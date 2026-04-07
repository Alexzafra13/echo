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
  let mockSettingsService: { getString: jest.Mock };
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

  const createService = (settingsService?: { getString: jest.Mock } | null) =>
    new FilesystemService(mockLogger, settingsService ?? undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    mockSettingsService = { getString: jest.fn().mockResolvedValue('') };
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

  describe('onModuleInit', () => {
    it('should load library.music.path from settings and add to allowedRoots', async () => {
      mockSettingsService.getString.mockResolvedValue('/mnt/navidrome/musica');
      service = createService(mockSettingsService);

      await service.onModuleInit();

      // Ahora el path debería ser válido
      const result = service.validateMusicPath(
        p('/mnt', 'navidrome', 'musica', 'artist', 'track.mp3')
      );
      expect(result).toBe(path.resolve(p('/mnt', 'navidrome', 'musica', 'artist', 'track.mp3')));
    });

    it('should handle empty library path gracefully', async () => {
      mockSettingsService.getString.mockResolvedValue('');
      service = createService(mockSettingsService);

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should handle settings service errors gracefully', async () => {
      mockSettingsService.getString.mockRejectedValue(new Error('DB error'));
      service = createService(mockSettingsService);

      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should work without settings service (backwards compatibility)', async () => {
      service = createService(null);

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('addAllowedRoot', () => {
    it('should add a new root and allow paths under it', () => {
      service = createService();

      service.addAllowedRoot('/mnt/nas/music');

      const result = service.validateMusicPath(p('/mnt', 'nas', 'music', 'track.mp3'));
      expect(result).toBe(path.resolve(p('/mnt', 'nas', 'music', 'track.mp3')));
    });

    it('should not add duplicate roots', () => {
      service = createService();

      service.addAllowedRoot('/mnt/nas/music');
      service.addAllowedRoot('/mnt/nas/music');

      // info se llama solo una vez (no duplicado)
      const infoCalls = (mockLogger.info as jest.Mock).mock.calls.filter(
        (call) => typeof call[0] === 'object' && call[0].path
      );
      expect(infoCalls).toHaveLength(1);
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

  describe('validateMusicPath', () => {
    it('should return the resolved path for a valid path under allowedRoots', () => {
      service = createService();
      const validPath = p('/music', 'artist', 'album', 'track.flac');
      const result = service.validateMusicPath(validPath);
      expect(result).toBe(path.resolve(validPath));
    });

    it('should return the resolved path for a valid path under DATA_PATH', () => {
      service = createService();
      const validPath = p('/test', 'data', 'uploads', 'song.mp3');
      const result = service.validateMusicPath(validPath);
      expect(result).toBe(path.resolve(validPath));
    });

    // On Windows, any absolute path with a drive letter is allowed as fallback,
    // so these rejection tests only apply on non-Windows platforms.
    if (process.platform !== 'win32') {
      it('should throw ForbiddenException for a path outside allowedRoots', () => {
        service = createService();
        expect(() => service.validateMusicPath('/tmp/malicious/file.mp3')).toThrow(
          ForbiddenException
        );
      });

      it('should throw ForbiddenException for path traversal attempts', () => {
        service = createService();
        expect(() => service.validateMusicPath(p('/music', '..', '..', 'etc', 'passwd'))).toThrow(
          ForbiddenException
        );
      });
    }

    it('should include ALLOWED_MUSIC_PATHS in allowedRoots', () => {
      process.env.ALLOWED_MUSIC_PATHS = '/mnt/nas/music, /srv/audio';
      service = createService();

      const result = service.validateMusicPath(p('/mnt', 'nas', 'music', 'track.mp3'));
      expect(result).toBe(path.resolve(p('/mnt', 'nas', 'music', 'track.mp3')));
    });

    it('should allow paths under dynamically added roots', async () => {
      mockSettingsService.getString.mockResolvedValue('/mnt/navidrome/musica');
      service = createService(mockSettingsService);
      await service.onModuleInit();

      const result = service.validateMusicPath(
        p('/mnt', 'navidrome', 'musica', 'New Found Glory', 'track.mp3')
      );
      expect(result).toBe(
        path.resolve(p('/mnt', 'navidrome', 'musica', 'New Found Glory', 'track.mp3'))
      );
    });
  });
});
