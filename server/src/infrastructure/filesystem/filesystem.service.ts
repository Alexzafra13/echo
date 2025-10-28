import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesystemService {
  private uploadPath = process.env.UPLOAD_PATH || './uploads/music';
  private coversPath = process.env.COVERS_PATH || './uploads/covers';

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
    if (!fs.existsSync(this.coversPath)) {
      fs.mkdirSync(this.coversPath, { recursive: true });
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