import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import * as path from 'path';

/**
 * FileScannerService - Servicio para escanear directorios y encontrar archivos de música
 *
 * Responsabilidades:
 * - Escanear directorios recursivamente
 * - Filtrar archivos de música por extensión
 * - Retornar rutas de archivos encontrados
 */
@Injectable()
export class FileScannerService {
  /**
   * Extensiones de audio soportadas
   */
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

  /**
   * Escanea un directorio en busca de archivos de música
   *
   * @param rootPath - Ruta raíz a escanear
   * @param recursive - Si debe escanear subdirectorios
   * @returns Array de rutas absolutas de archivos de música
   */
  async scanDirectory(
    rootPath: string,
    recursive: boolean = true,
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      await this.scanRecursive(rootPath, files, recursive);
    } catch (error) {
      console.error(`Error escaneando directorio ${rootPath}:`, error);
      throw error;
    }

    return files;
  }

  /**
   * Función recursiva para escanear directorios
   */
  private async scanRecursive(
    currentPath: string,
    files: string[],
    recursive: boolean,
  ): Promise<void> {
    let entries;

    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      console.error(`Error leyendo directorio ${currentPath}:`, error);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Si es directorio y recursive=true, escanear recursivamente
        if (recursive) {
          await this.scanRecursive(fullPath, files, recursive);
        }
      } else if (entry.isFile()) {
        // Si es archivo, verificar si es de música
        if (this.isMusicFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  /**
   * Verifica si un archivo es de música basándose en su extensión
   */
  private isMusicFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.SUPPORTED_EXTENSIONS.includes(ext);
  }

  /**
   * Obtiene la extensión de un archivo
   */
  getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase().substring(1);
  }

  /**
   * Verifica si una ruta existe
   */
  async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene stats de un archivo
   */
  async getFileStats(filePath: string): Promise<Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch {
      return null;
    }
  }
}
