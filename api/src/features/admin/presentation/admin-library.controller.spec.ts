import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { AdminLibraryController } from './admin-library.controller';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = jest.mocked(fs);

const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
  assign: jest.fn(),
};

describe('AdminLibraryController', () => {
  let controller: AdminLibraryController;
  let mockSettingsService: jest.Mocked<SettingsService>;

  // Store original env
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv, NODE_ENV: 'test' };

    mockSettingsService = {
      getString: jest.fn(),
      set: jest.fn(),
      getNumber: jest.fn(),
      getBoolean: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SettingsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLibraryController],
      providers: [
        {
          provide: getLoggerToken(AdminLibraryController.name),
          useValue: mockLogger,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminLibraryController>(AdminLibraryController);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /admin/library - getLibrary', () => {
    it('debería retornar configuración de librería existente', async () => {
      // Arrange
      const savedPath = '/music';
      mockSettingsService.getString.mockResolvedValue(savedPath);
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([
        { name: 'song1.mp3', isFile: () => true, isDirectory: () => false },
        { name: 'song2.flac', isFile: () => true, isDirectory: () => false },
      ] as any);

      // Act
      const result = await controller.getLibrary();

      // Assert
      expect(result.path).toBe(savedPath);
      expect(result.exists).toBe(true);
      expect(result.readable).toBe(true);
      expect(result.mountedPaths).toBeDefined();
    });

    it('debería retornar exists=false cuando el path no existe', async () => {
      // Arrange
      mockSettingsService.getString.mockResolvedValue('/nonexistent');
      mockedFs.access.mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await controller.getLibrary();

      // Assert
      expect(result.exists).toBe(false);
      expect(result.readable).toBe(false);
    });

    it('debería usar MUSIC_LIBRARY_PATH de entorno como fallback', async () => {
      // Arrange
      process.env.MUSIC_LIBRARY_PATH = '/custom/music';
      mockSettingsService.getString.mockImplementation(
        (key, defaultValue) => Promise.resolve(defaultValue)
      );
      mockedFs.access.mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await controller.getLibrary();

      // Assert
      expect(mockSettingsService.getString).toHaveBeenCalledWith(
        'library.music.path',
        '/custom/music'
      );
    });

    it('debería retornar puntos de montaje disponibles', async () => {
      // Arrange
      mockSettingsService.getString.mockResolvedValue('/music');
      mockedFs.access.mockImplementation((path) => {
        if (path === '/music' || path === '/mnt' || path === '/media') {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([]);

      // Act
      const result = await controller.getLibrary();

      // Assert
      expect(result.mountedPaths).toBeDefined();
      expect(Array.isArray(result.mountedPaths)).toBe(true);
    });
  });

  describe('PUT /admin/library - updateLibrary', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'; // Allow any path in development
    });

    it('debería actualizar el path de la librería', async () => {
      // Arrange
      const newPath = '/new/music/path';
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([]);
      mockSettingsService.set.mockResolvedValue(undefined);

      // Act
      const result = await controller.updateLibrary({ path: newPath });

      // Assert
      expect(result.success).toBe(true);
      expect(result.path).toBe(newPath);
      expect(mockSettingsService.set).toHaveBeenCalledWith(
        'library.music.path',
        newPath
      );
    });

    it('debería rechazar si el path no existe', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('ENOENT'));

      // Act & Assert
      await expect(
        controller.updateLibrary({ path: '/nonexistent' })
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar si el path no es un directorio', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      // Act & Assert
      await expect(
        controller.updateLibrary({ path: '/path/to/file.txt' })
      ).rejects.toThrow(BadRequestException);
    });

    it('debería normalizar el path (backslashes a forward slashes)', async () => {
      // Arrange
      const windowsPath = 'C:\\Users\\Music';
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([]);
      mockSettingsService.set.mockResolvedValue(undefined);

      // Act
      const result = await controller.updateLibrary({ path: windowsPath });

      // Assert
      expect(result.path).not.toContain('\\');
    });

    it('debería contar archivos de música en el directorio', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([
        { name: 'song1.mp3', isFile: () => true, isDirectory: () => false },
        { name: 'song2.flac', isFile: () => true, isDirectory: () => false },
        { name: 'cover.jpg', isFile: () => true, isDirectory: () => false },
      ] as any);
      mockSettingsService.set.mockResolvedValue(undefined);

      // Act
      const result = await controller.updateLibrary({ path: '/music' });

      // Assert
      expect(result.fileCount).toBe(2); // Only mp3 and flac
    });

    it('debería validar paths permitidos en producción', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Recreate controller with production env
      const module = await Test.createTestingModule({
        controllers: [AdminLibraryController],
        providers: [
          {
            provide: getLoggerToken(AdminLibraryController.name),
            useValue: mockLogger,
          },
          {
            provide: SettingsService,
            useValue: mockSettingsService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .overrideGuard(AdminGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

      const prodController = module.get<AdminLibraryController>(AdminLibraryController);

      // Act & Assert
      await expect(
        prodController.updateLibrary({ path: '/etc/passwd' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /admin/library/browse - browseDirectories', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('debería listar directorios en un path', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([
        { name: 'subdir1', isDirectory: () => true, isFile: () => false },
        { name: 'subdir2', isDirectory: () => true, isFile: () => false },
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
        { name: '.hidden', isDirectory: () => true, isFile: () => false },
      ] as any);

      // Act
      const result = await controller.browseDirectories({ path: '/music' });

      // Assert
      expect(result.currentPath).toBe('/music');
      expect(result.directories).toHaveLength(2); // Only visible directories
      expect(result.directories.map((d: any) => d.name)).not.toContain('.hidden');
    });

    it('debería indicar si se puede subir un nivel', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([]);

      // Act
      const result = await controller.browseDirectories({ path: '/music/artist' });

      // Assert
      expect(result.canGoUp).toBe(true);
      expect(result.parentPath).toBeDefined();
    });

    it('debería indicar si un directorio contiene archivos de música', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir
        .mockResolvedValueOnce([
          { name: 'album1', isDirectory: () => true, isFile: () => false },
        ] as any)
        .mockResolvedValueOnce(['song.mp3', 'song.flac']); // Contents of album1

      // Act
      const result = await controller.browseDirectories({ path: '/music' });

      // Assert
      expect(result.directories[0].hasMusic).toBe(true);
    });

    it('debería rechazar si el path no es un directorio', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => false,
      } as any);

      // Act & Assert
      await expect(
        controller.browseDirectories({ path: '/music/file.txt' })
      ).rejects.toThrow(BadRequestException);
    });

    it('debería ordenar directorios alfabéticamente', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);
      mockedFs.readdir.mockResolvedValue([
        { name: 'zebra', isDirectory: () => true, isFile: () => false },
        { name: 'alpha', isDirectory: () => true, isFile: () => false },
        { name: 'beta', isDirectory: () => true, isFile: () => false },
      ] as any);

      // Act
      const result = await controller.browseDirectories({ path: '/music' });

      // Assert
      const names = result.directories.map((d: any) => d.name);
      expect(names).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('debería retornar puntos de montaje permitidos al navegar a /', async () => {
      // Arrange
      mockedFs.access.mockImplementation((path) => {
        if (['/mnt', '/media', '/music'].includes(path as string)) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });
      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);

      // Act
      const result = await controller.browseDirectories({ path: '/' });

      // Assert
      expect(result.currentPath).toBe('/');
      expect(result.canGoUp).toBe(false);
      expect(result.parentPath).toBeNull();
    });

    it('debería manejar errores de acceso gracefully', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(
        controller.browseDirectories({ path: '/root' })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
