import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import * as path from 'path';

@Injectable()
export class FileScannerService {
  constructor(
    @InjectPinoLogger(FileScannerService.name)
    private readonly logger: PinoLogger,
  ) {}

  private readonly SUPPORTED_EXTENSIONS = [
    '.mp3',
    '.flac',
    '.m4a',
    '.aac',
    '.ogg',
    '.opus',
    '.wav',
    '.wma',
    '.ape',
  ];

  async scanDirectory(
    rootPath: string,
    recursive: boolean = true,
  ): Promise<string[]> {
    const files: string[] = [];

    const exists = await this.pathExists(rootPath);
    if (!exists) {
      this.logger.warn({ rootPath }, 'Scan directory does not exist, returning empty list');
      return files;
    }

    try {
      await this.scanRecursive(rootPath, files, recursive);
    } catch (error) {
      this.logger.error({ err: error, rootPath }, 'Error scanning directory');
      throw error;
    }

    return files;
  }

  private async scanRecursive(
    currentPath: string,
    files: string[],
    recursive: boolean,
  ): Promise<void> {
    let entries;

    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      this.logger.error({ err: error, path: currentPath }, 'Error reading directory');
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && recursive) {
        await this.scanRecursive(fullPath, files, recursive);
      } else if (entry.isFile() && this.isMusicFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  private isMusicFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.SUPPORTED_EXTENSIONS.includes(ext);
  }

  getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase().substring(1);
  }

  async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch {
      return null;
    }
  }
}
