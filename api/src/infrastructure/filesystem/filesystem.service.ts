import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesystemService {
  // Use DATA_PATH for all persistent storage (Jellyfin-style)
  private readonly dataPath = process.env.DATA_PATH || '/app/data';
  private readonly uploadPath: string;
  private readonly coversPath: string;

  constructor(
    @InjectPinoLogger(FilesystemService.name)
    private readonly logger: PinoLogger,
  ) {
    // All paths relative to DATA_PATH
    this.uploadPath = path.join(this.dataPath, 'uploads');
    this.coversPath = path.join(this.dataPath, 'covers');
    this.ensureDirectories();
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
        // In production, directories are created by entrypoint
        // This is just a fallback for development
        this.logger.warn(`Could not create ${dir}: ${(error as Error).message}`);
      }
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    return fs.promises.readdir(dirPath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return fs.promises.access(filePath).then(
      () => true,
      () => false,
    );
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    return fs.promises.stat(filePath);
  }

  createReadStream(filePath: string, start?: number, end?: number) {
    return fs.createReadStream(filePath, { start, end });
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  getCoversPath(): string {
    return this.coversPath;
  }
}