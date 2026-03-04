import { Injectable, ForbiddenException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesystemService {
  // Use DATA_PATH for all persistent storage (Jellyfin-style)
  private readonly dataPath = process.env.DATA_PATH || '/app/data';
  private readonly libraryPath = process.env.LIBRARY_PATH || '/music';
  private readonly uploadPath: string;
  private readonly coversPath: string;

  /** Allowed base directories for filesystem operations */
  private readonly allowedRoots: string[];

  constructor(
    @InjectPinoLogger(FilesystemService.name)
    private readonly logger: PinoLogger
  ) {
    this.uploadPath = path.join(this.dataPath, 'uploads');
    this.coversPath = path.join(this.dataPath, 'covers');
    this.allowedRoots = [path.resolve(this.dataPath), path.resolve(this.libraryPath)];
    this.ensureDirectories();
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
