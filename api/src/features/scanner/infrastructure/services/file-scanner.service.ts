import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import * as path from 'path';
import { SUPPORTED_AUDIO_EXTENSIONS, SUPPORTED_VIDEO_EXTENSIONS } from './supported-extensions';

@Injectable()
export class FileScannerService {
  private readonly MAX_DEPTH = 20;

  constructor(
    @InjectPinoLogger(FileScannerService.name)
    private readonly logger: PinoLogger
  ) {}

  async scanDirectory(rootPath: string, recursive: boolean = true): Promise<string[]> {
    const files: string[] = [];

    const exists = await this.pathExists(rootPath);
    if (!exists) {
      this.logger.warn({ rootPath }, 'Scan directory does not exist, returning empty list');
      return files;
    }

    const visited = new Set<string>();

    try {
      await this.scanRecursiveWithFilter(rootPath, files, recursive, visited, 0, (name) =>
        this.isMusicFile(name)
      );
    } catch (error) {
      this.logger.error({ err: error, rootPath }, 'Error scanning directory');
      throw error;
    }

    return files;
  }

  async scanDirectoryForVideos(rootPath: string, recursive: boolean = true): Promise<string[]> {
    const files: string[] = [];
    const exists = await this.pathExists(rootPath);
    if (!exists) return files;

    const visited = new Set<string>();
    await this.scanRecursiveWithFilter(rootPath, files, recursive, visited, 0, (name) =>
      this.isVideoFile(name)
    );
    return files;
  }

  private async scanRecursiveWithFilter(
    currentPath: string,
    files: string[],
    recursive: boolean,
    visited: Set<string>,
    depth: number,
    filter: (name: string) => boolean
  ): Promise<void> {
    if (depth > this.MAX_DEPTH) {
      this.logger.warn({ path: currentPath, depth }, 'Max scan depth reached, skipping');
      return;
    }

    let realPath: string;
    try {
      realPath = await fs.realpath(currentPath);
    } catch {
      this.logger.debug({ path: currentPath }, 'Cannot resolve real path, skipping');
      return;
    }

    if (visited.has(realPath)) {
      this.logger.debug({ path: currentPath, realPath }, 'Circular symlink detected, skipping');
      return;
    }
    visited.add(realPath);

    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      this.logger.error({ err: error, path: currentPath }, 'Error reading directory');
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if ((entry.isDirectory() || entry.isSymbolicLink()) && recursive) {
        if (entry.isSymbolicLink()) {
          try {
            const stat = await fs.stat(fullPath);
            if (!stat.isDirectory()) {
              if (filter(entry.name)) files.push(fullPath);
              continue;
            }
          } catch {
            continue;
          }
        }
        await this.scanRecursiveWithFilter(fullPath, files, recursive, visited, depth + 1, filter);
      } else if (entry.isFile() && filter(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  private isMusicFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(ext);
  }

  private isVideoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
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
