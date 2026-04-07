import { Injectable, ForbiddenException, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';

// Token para inyección opcional de SettingsService (evita dependencia circular)
export const SETTINGS_SERVICE_TOKEN = 'FILESYSTEM_SETTINGS_SERVICE';

const LIBRARY_PATH_KEY = 'library.music.path';

@Injectable()
export class FilesystemService implements OnModuleInit {
  // Use DATA_PATH for all persistent storage (Jellyfin-style)
  private readonly dataPath = process.env.DATA_PATH || '/app/data';
  private readonly libraryPath = process.env.LIBRARY_PATH || '/music';
  private readonly uploadPath: string;
  private readonly coversPath: string;

  /**
   * Directorios base permitidos para operaciones de filesystem.
   * Se inicializa con env vars y se extiende dinámicamente con el
   * path de librería configurado en la DB (library.music.path).
   */
  private readonly allowedRoots: string[];

  /** Whether we are running on Windows */
  private readonly isWindows = process.platform === 'win32';

  /** Referencia al SettingsService (opcional para no romper tests unitarios) */
  private readonly settingsService: { getString(key: string, def: string): Promise<string> } | null;

  constructor(
    @InjectPinoLogger(FilesystemService.name)
    private readonly logger: PinoLogger,
    @Optional()
    @Inject(SETTINGS_SERVICE_TOKEN)
    settingsService?: { getString(key: string, def: string): Promise<string> } | null
  ) {
    this.settingsService = settingsService ?? null;
    this.uploadPath = path.join(this.dataPath, 'uploads');
    this.coversPath = path.join(this.dataPath, 'covers');

    const musicPaths =
      process.env.ALLOWED_MUSIC_PATHS?.split(',')
        .map((p) => path.resolve(p.trim()))
        .filter(Boolean) || [];
    this.allowedRoots = [
      path.resolve(this.dataPath),
      path.resolve(this.libraryPath),
      ...musicPaths,
    ];

    this.ensureDirectories();
  }

  /**
   * Al iniciar el módulo, carga el path de librería configurado en la DB
   * y lo añade a los roots permitidos. Esto sincroniza lo que el scanner
   * escanea con lo que el streaming permite servir.
   */
  async onModuleInit(): Promise<void> {
    await this.refreshLibraryPath();
  }

  /**
   * Re-lee library.music.path de la DB y lo registra como root permitido.
   * Llamar después de que el admin cambie el path de la librería.
   */
  async refreshLibraryPath(): Promise<void> {
    if (!this.settingsService) return;

    try {
      const dbLibraryPath = await this.settingsService.getString(LIBRARY_PATH_KEY, '');
      if (dbLibraryPath) {
        this.addAllowedRoot(dbLibraryPath);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo cargar library.music.path de la DB: ${(error as Error).message}`
      );
    }
  }

  /**
   * Registra un directorio como root permitido si no existe ya.
   * Usado cuando el admin actualiza el path de la librería.
   */
  addAllowedRoot(rootPath: string): void {
    const resolved = path.resolve(rootPath);
    if (!this.allowedRoots.includes(resolved)) {
      this.allowedRoots.push(resolved);
      this.logger.info({ path: resolved }, 'Nuevo root permitido registrado');
    }
  }

  /**
   * Validates that a resolved path is within one of the allowed base directories.
   * Prevents path traversal attacks (e.g. ../../etc/passwd).
   */
  private assertSafePath(filePath: string): void {
    const resolved = path.resolve(filePath);
    const isAllowed = this.allowedRoots.some(
      (root) => resolved === root || resolved.startsWith(root + path.sep)
    );
    if (!isAllowed) {
      this.logger.warn({ filePath: resolved }, 'Path traversal attempt blocked');
      throw new ForbiddenException('Access denied: path outside allowed directories');
    }
  }

  private ensureDirectories() {
    const dirs = [this.uploadPath, this.coversPath];
    for (const dir of dirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          this.logger.info(`Created directory: ${dir}`);
        }
      } catch (error) {
        this.logger.warn(`Could not create ${dir}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Validates that a file path is within allowed music directories.
   * Returns the resolved path if valid.
   * On Windows, if no explicit music paths are configured, falls back to
   * checking that it is an absolute path with a drive letter.
   */
  validateMusicPath(filePath: string): string {
    const resolved = path.resolve(filePath);
    const isAllowed = this.allowedRoots.some(
      (root) => resolved === root || resolved.startsWith(root + path.sep)
    );

    if (!isAllowed) {
      // En Windows (desarrollo), permitir paths absolutos con drive letter.
      // En producción (Docker/Linux) este branch nunca se ejecuta.
      // NOTA: si se expone el servidor en red, configurar LIBRARY_PATH o
      // ALLOWED_MUSIC_PATHS para restringir el acceso a directorios específicos.
      if (this.isWindows && /^[A-Za-z]:\\/.test(resolved)) {
        return resolved;
      }

      this.logger.warn(
        { filePath: resolved },
        'Music path validation failed – path outside allowed directories'
      );
      throw new ForbiddenException('Access denied: path outside allowed music directories');
    }

    return resolved;
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    this.assertSafePath(dirPath);
    return fs.promises.readdir(dirPath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    this.assertSafePath(filePath);
    return fs.promises.access(filePath).then(
      () => true,
      () => false
    );
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    this.assertSafePath(filePath);
    return fs.promises.stat(filePath);
  }

  createReadStream(filePath: string, start?: number, end?: number) {
    this.assertSafePath(filePath);
    return fs.createReadStream(filePath, { start, end });
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  getCoversPath(): string {
    return this.coversPath;
  }

  getDataPath(): string {
    return this.dataPath;
  }
}
