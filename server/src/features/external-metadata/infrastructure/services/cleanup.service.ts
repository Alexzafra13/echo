import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Resultado de operación de limpieza
 */
export interface CleanupResult {
  /** Número de archivos eliminados */
  filesRemoved: number;
  /** Espacio liberado en bytes */
  spaceFree: number;
  /** Archivos huérfanos encontrados */
  orphanedFiles: string[];
  /** Errores durante la limpieza */
  errors: string[];
  /** Duración de la operación en ms */
  duration: number;
}

/**
 * Estadísticas de almacenamiento
 */
export interface StorageStats {
  /** Tamaño total usado en bytes */
  totalSize: number;
  /** Número de artistas con metadatos */
  artistsWithMetadata: number;
  /** Número de álbumes con covers externos */
  albumsWithCovers: number;
  /** Archivos totales en disco */
  totalFiles: number;
  /** Archivos huérfanos (sin referencia en DB) */
  orphanedFiles: number;
  /** Tamaño promedio por artista en bytes */
  avgSizePerArtist: number;
}

/**
 * CleanupService
 *
 * Servicio para limpieza y mantenimiento de archivos de metadatos externos.
 *
 * Funcionalidades:
 * - Detectar archivos huérfanos (sin referencia en base de datos)
 * - Eliminar archivos huérfanos para liberar espacio
 * - Recalcular tamaños de almacenamiento por artista
 * - Generar estadísticas de uso de almacenamiento
 * - Verificar integridad de archivos referenciados
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Detecta y elimina archivos huérfanos
   * (archivos en disco sin referencia en base de datos)
   */
  async cleanupOrphanedFiles(dryRun = true): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      filesRemoved: 0,
      spaceFree: 0,
      orphanedFiles: [],
      errors: [],
      duration: 0,
    };

    try {
      this.logger.log(`Starting cleanup (dry run: ${dryRun})`);

      // 1. Limpiar archivos huérfanos de artistas
      const artistCleanup = await this.cleanupArtistFiles(dryRun);
      result.filesRemoved += artistCleanup.filesRemoved;
      result.spaceFree += artistCleanup.spaceFree;
      result.orphanedFiles.push(...artistCleanup.orphanedFiles);
      result.errors.push(...artistCleanup.errors);

      // 2. Limpiar archivos huérfanos de álbumes
      const albumCleanup = await this.cleanupAlbumFiles(dryRun);
      result.filesRemoved += albumCleanup.filesRemoved;
      result.spaceFree += albumCleanup.spaceFree;
      result.orphanedFiles.push(...albumCleanup.orphanedFiles);
      result.errors.push(...albumCleanup.errors);

      result.duration = Date.now() - startTime;

      this.logger.log(
        `Cleanup completed: ${result.filesRemoved} files removed, ` +
          `${(result.spaceFree / 1024 / 1024).toFixed(2)} MB freed in ${result.duration}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Cleanup failed: ${(error as Error).message}`, (error as Error).stack);
      result.errors.push((error as Error).message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Recalcula los tamaños de almacenamiento para todos los artistas
   */
  async recalculateStorageSizes(): Promise<{
    updated: number;
    errors: string[];
  }> {
    const result: { updated: number; errors: string[] } = {
      updated: 0,
      errors: [],
    };

    try {
      this.logger.log('Recalculating storage sizes...');

      // Obtener todos los artistas con metadatos externos
      const artists = await this.prisma.artist.findMany({
        where: {
          OR: [
            { externalProfilePath: { not: null } },
            { externalBackgroundPath: { not: null } },
            { externalBannerPath: { not: null } },
            { externalLogoPath: { not: null } },
          ],
        },
        select: {
          id: true,
          name: true,
        },
      });

      for (const artist of artists) {
        try {
          const metadataPath = await this.storage.getArtistMetadataPath(artist.id);
          const size = await this.storage.getStorageSize(metadataPath);

          await this.prisma.artist.update({
            where: { id: artist.id },
            data: { metadataStorageSize: BigInt(size) },
          });

          result.updated++;
        } catch (error) {
          const errorMsg = `Failed to update size for artist ${artist.name}: ${(error as Error).message}`;
          this.logger.warn(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      this.logger.log(`Storage sizes recalculated for ${result.updated} artists`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to recalculate storage sizes: ${(error as Error).message}`, (error as Error).stack);
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Genera estadísticas de uso de almacenamiento
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      // Contar artistas con metadatos
      const artistsWithMetadata = await this.prisma.artist.count({
        where: {
          OR: [
            { externalProfilePath: { not: null } },
            { externalBackgroundPath: { not: null } },
            { externalBannerPath: { not: null } },
            { externalLogoPath: { not: null } },
          ],
        },
      });

      // Contar álbumes con covers externos
      const albumsWithCovers = await this.prisma.album.count({
        where: {
          externalCoverPath: { not: null },
        },
      });

      // Calcular tamaño total
      const sizeAgg = await this.prisma.artist.aggregate({
        _sum: {
          metadataStorageSize: true,
        },
        where: {
          metadataStorageSize: { not: null },
        },
      });

      const totalSize = Number(sizeAgg._sum.metadataStorageSize || 0);

      // Contar archivos en disco
      const basePath = await this.storage.getStoragePath();
      const totalFiles = await this.countFilesInDirectory(path.join(basePath, 'artists'));

      // Calcular promedio
      const avgSizePerArtist =
        artistsWithMetadata > 0 ? totalSize / artistsWithMetadata : 0;

      return {
        totalSize,
        artistsWithMetadata,
        albumsWithCovers,
        totalFiles,
        orphanedFiles: 0, // Se calcula en cleanupOrphanedFiles
        avgSizePerArtist,
      };
    } catch (error) {
      this.logger.error(`Failed to get storage stats: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Verifica la integridad de archivos referenciados en la base de datos
   */
  async verifyIntegrity(): Promise<{
    totalChecked: number;
    missing: string[];
    errors: string[];
  }> {
    const result: { totalChecked: number; missing: string[]; errors: string[] } = {
      totalChecked: 0,
      missing: [],
      errors: [],
    };

    try {
      this.logger.log('Verifying file integrity...');

      // Verificar imágenes de artistas
      const artists = await this.prisma.artist.findMany({
        where: {
          OR: [
            { externalProfilePath: { not: null } },
            { externalBackgroundPath: { not: null } },
            { externalBannerPath: { not: null } },
            { externalLogoPath: { not: null } },
          ],
        },
        select: {
          id: true,
          name: true,
          externalProfilePath: true,
          externalBackgroundPath: true,
          externalBannerPath: true,
          externalLogoPath: true,
        },
      });

      for (const artist of artists) {
        const paths = [
          artist.externalProfilePath,
          artist.externalBackgroundPath,
          artist.externalBannerPath,
          artist.externalLogoPath,
        ].filter((p) => p !== null);

        for (const filePath of paths) {
          result.totalChecked++;
          try {
            await fs.access(filePath);
          } catch (error) {
            result.missing.push(`Artist ${artist.name}: ${filePath}`);
          }
        }
      }

      // Verificar covers de álbumes
      const albums = await this.prisma.album.findMany({
        where: {
          externalCoverPath: { not: null },
        },
        select: {
          id: true,
          name: true,
          externalCoverPath: true,
        },
      });

      for (const album of albums) {
        if (!album.externalCoverPath) continue;

        result.totalChecked++;
        try {
          await fs.access(album.externalCoverPath);
        } catch (error) {
          result.missing.push(`Album ${album.name}: ${album.externalCoverPath}`);
        }
      }

      this.logger.log(
        `Integrity check completed: ${result.totalChecked} files checked, ${result.missing.length} missing`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to verify integrity: ${(error as Error).message}`, (error as Error).stack);
      result.errors.push((error as Error).message);
      return result;
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Limpia archivos huérfanos de artistas
   */
  private async cleanupArtistFiles(dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      filesRemoved: 0,
      spaceFree: 0,
      orphanedFiles: [],
      errors: [],
      duration: 0,
    };

    try {
      const basePath = await this.storage.getStoragePath();
      const artistsPath = path.join(basePath, 'artists');

      // Verificar que el directorio existe
      try {
        await fs.access(artistsPath);
      } catch (error) {
        // El directorio no existe, no hay nada que limpiar
        return result;
      }

      // Obtener todos los IDs de artistas en la base de datos
      const dbArtists = await this.prisma.artist.findMany({
        select: { id: true },
      });
      const dbArtistIds = new Set(dbArtists.map((a) => a.id));

      // Listar directorios en /storage/metadata/artists/
      const artistDirs = await fs.readdir(artistsPath);

      for (const dirName of artistDirs) {
        // Si el directorio no corresponde a un artista en la DB, es huérfano
        if (!dbArtistIds.has(dirName)) {
          const dirPath = path.join(artistsPath, dirName);

          try {
            // Calcular tamaño
            const size = await this.storage.getStorageSize(dirPath);
            result.spaceFree += size;

            // Contar archivos
            const files = await this.listAllFiles(dirPath);
            result.filesRemoved += files.length;
            result.orphanedFiles.push(...files);

            // Eliminar si no es dry run
            if (!dryRun) {
              await fs.rm(dirPath, { recursive: true, force: true });
              this.logger.log(`Removed orphaned artist directory: ${dirPath}`);
            } else {
              this.logger.debug(`Would remove: ${dirPath} (${files.length} files)`);
            }
          } catch (error) {
            const errorMsg = `Failed to process ${dirPath}: ${(error as Error).message}`;
            this.logger.warn(errorMsg);
            result.errors.push(errorMsg);
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to cleanup artist files: ${(error as Error).message}`, (error as Error).stack);
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Limpia archivos huérfanos de álbumes
   */
  private async cleanupAlbumFiles(dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      filesRemoved: 0,
      spaceFree: 0,
      orphanedFiles: [],
      errors: [],
      duration: 0,
    };

    try {
      const basePath = await this.storage.getStoragePath();
      const albumsPath = path.join(basePath, 'albums');

      // Verificar que el directorio existe
      try {
        await fs.access(albumsPath);
      } catch (error) {
        // El directorio no existe, no hay nada que limpiar
        return result;
      }

      // Obtener todos los IDs de álbumes en la base de datos
      const dbAlbums = await this.prisma.album.findMany({
        select: { id: true },
      });
      const dbAlbumIds = new Set(dbAlbums.map((a) => a.id));

      // Listar directorios en /storage/metadata/albums/
      const albumDirs = await fs.readdir(albumsPath);

      for (const dirName of albumDirs) {
        // Si el directorio no corresponde a un álbum en la DB, es huérfano
        if (!dbAlbumIds.has(dirName)) {
          const dirPath = path.join(albumsPath, dirName);

          try {
            // Calcular tamaño
            const size = await this.storage.getStorageSize(dirPath);
            result.spaceFree += size;

            // Contar archivos
            const files = await this.listAllFiles(dirPath);
            result.filesRemoved += files.length;
            result.orphanedFiles.push(...files);

            // Eliminar si no es dry run
            if (!dryRun) {
              await fs.rm(dirPath, { recursive: true, force: true });
              this.logger.log(`Removed orphaned album directory: ${dirPath}`);
            } else {
              this.logger.debug(`Would remove: ${dirPath} (${files.length} files)`);
            }
          } catch (error) {
            const errorMsg = `Failed to process ${dirPath}: ${(error as Error).message}`;
            this.logger.warn(errorMsg);
            result.errors.push(errorMsg);
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to cleanup album files: ${(error as Error).message}`, (error as Error).stack);
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Lista todos los archivos en un directorio recursivamente
   */
  private async listAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to list files in ${dirPath}: ${(error as Error).message}`);
    }

    return files;
  }

  /**
   * Cuenta archivos en un directorio recursivamente
   */
  private async countFilesInDirectory(dirPath: string): Promise<number> {
    try {
      const files = await this.listAllFiles(dirPath);
      return files.length;
    } catch (error) {
      return 0;
    }
  }
}
