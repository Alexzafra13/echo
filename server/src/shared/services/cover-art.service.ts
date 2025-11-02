import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseFile } from 'music-metadata';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * CoverArtService - Gestiona la extracción y caché de covers de álbumes
 *
 * Inspirado en Navidrome:
 * 1. Busca covers externos (cover.jpg, folder.jpg, etc.)
 * 2. Extrae covers embebidas del archivo de audio
 * 3. Cachea las imágenes en disco
 * 4. Retorna rutas relativas para servir
 */
@Injectable()
export class CoverArtService {
  private readonly logger = new Logger(CoverArtService.name);
  private readonly coversPath: string;

  // Nombres comunes de archivos de cover (ordenados por prioridad)
  private readonly COVER_FILENAMES = [
    'cover.jpg',
    'cover.png',
    'folder.jpg',
    'folder.png',
    'album.jpg',
    'album.png',
    'front.jpg',
    'front.png',
    'Cover.jpg',
    'Folder.jpg',
    'Album.jpg',
  ];

  constructor(private readonly configService: ConfigService) {
    // Directorio donde se cachearán las covers
    // Prioridad: COVERS_PATH > UPLOAD_PATH/covers > ./uploads/covers
    const coversPath = this.configService.get<string>('COVERS_PATH');
    if (coversPath) {
      this.coversPath = coversPath;
    } else {
      const uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
      this.coversPath = path.join(uploadPath, 'covers');
    }
    this.ensureCoversDirectory();
  }

  /**
   * Asegura que el directorio de covers existe
   */
  private async ensureCoversDirectory(): Promise<void> {
    try {
      if (!existsSync(this.coversPath)) {
        await fs.mkdir(this.coversPath, { recursive: true });
        this.logger.log(`✅ Directorio de covers creado: ${this.coversPath}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error creando directorio de covers:`, error);
    }
  }

  /**
   * Extrae y cachea el cover de un álbum
   *
   * @param albumId - ID del álbum (usado para nombrar el archivo)
   * @param trackPath - Ruta del primer track del álbum
   * @returns Ruta relativa del cover cacheado o undefined
   */
  async extractAndCacheCover(
    albumId: string,
    trackPath: string,
  ): Promise<string | undefined> {
    try {
      // 1. Buscar cover externo en el directorio del track
      const trackDir = path.dirname(trackPath);
      const externalCover = await this.findExternalCover(trackDir);

      if (externalCover) {
        return await this.cacheCover(albumId, externalCover);
      }

      // 2. Extraer cover embebida del archivo de audio
      const embeddedCover = await this.extractEmbeddedCover(trackPath);

      if (embeddedCover) {
        return await this.cacheCoverFromBuffer(
          albumId,
          embeddedCover.data,
          embeddedCover.format,
        );
      }

      this.logger.warn(`⚠️ No se encontró cover para álbum ${albumId}`);
      return undefined;
    } catch (error) {
      this.logger.error(`❌ Error extrayendo cover para álbum ${albumId}:`, error);
      return undefined;
    }
  }

  /**
   * Busca un archivo de cover externo en el directorio
   */
  private async findExternalCover(directory: string): Promise<string | undefined> {
    for (const filename of this.COVER_FILENAMES) {
      const coverPath = path.join(directory, filename);
      if (existsSync(coverPath)) {
        this.logger.debug(`📁 Cover externo encontrado: ${filename}`);
        return coverPath;
      }
    }
    return undefined;
  }

  /**
   * Extrae cover embebida del archivo de audio
   */
  private async extractEmbeddedCover(
    trackPath: string,
  ): Promise<{ data: Buffer; format: string } | undefined> {
    try {
      const metadata = await parseFile(trackPath);
      const picture = metadata.common.picture?.[0];

      if (picture && picture.data) {
        this.logger.debug(`🎵 Cover embebida encontrada en: ${path.basename(trackPath)}`);
        return {
          data: Buffer.from(picture.data),
          format: picture.format || 'image/jpeg',
        };
      }

      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`⚠️ Error extrayendo cover de ${trackPath}:`, errorMessage);
      return undefined;
    }
  }

  /**
   * Cachea un cover desde un archivo externo
   */
  private async cacheCover(albumId: string, sourcePath: string): Promise<string> {
    const ext = path.extname(sourcePath);
    const destFileName = `${albumId}${ext}`;
    const destPath = path.join(this.coversPath, destFileName);

    // Copiar archivo con retry (para Windows EPERM errors)
    await this.copyFileWithRetry(sourcePath, destPath);

    this.logger.debug(`💾 Cover cacheada: ${destFileName}`);
    return destFileName;
  }

  /**
   * Copia un archivo con retry mechanism para manejar EPERM en Windows
   */
  private async copyFileWithRetry(
    source: string,
    dest: string,
    maxRetries = 3,
    delay = 100,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.copyFile(source, dest);
        return; // Éxito
      } catch (error: any) {
        // Si es un error de permisos (EPERM) en Windows, reintentar
        if (error.code === 'EPERM' && attempt < maxRetries) {
          this.logger.warn(
            `⚠️ EPERM error copying ${path.basename(source)}, retrying (${attempt}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
          continue;
        }
        // Si llegamos aquí, falló después de todos los reintentos o es otro error
        throw error;
      }
    }
  }

  /**
   * Cachea un cover desde un buffer (cover embebida)
   */
  private async cacheCoverFromBuffer(
    albumId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    // Determinar extensión desde MIME type
    const ext = this.mimeTypeToExtension(mimeType);
    const destFileName = `${albumId}${ext}`;
    const destPath = path.join(this.coversPath, destFileName);

    // Guardar buffer
    await fs.writeFile(destPath, buffer);

    this.logger.debug(`💾 Cover cacheada: ${destFileName}`);
    return destFileName;
  }

  /**
   * Convierte MIME type a extensión de archivo
   */
  private mimeTypeToExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return mimeMap[mimeType.toLowerCase()] || '.jpg';
  }

  /**
   * Obtiene la ruta absoluta de un cover cacheado
   */
  getCoverPath(fileName: string | undefined | null): string | undefined {
    if (!fileName) return undefined;
    const coverPath = path.join(this.coversPath, fileName);
    return existsSync(coverPath) ? coverPath : undefined;
  }

  /**
   * Verifica si un cover existe en el caché
   */
  async coverExists(fileName: string | undefined | null): Promise<boolean> {
    if (!fileName) return false;
    const coverPath = path.join(this.coversPath, fileName);
    return existsSync(coverPath);
  }

  /**
   * Elimina un cover del caché
   */
  async deleteCover(fileName: string): Promise<void> {
    try {
      const coverPath = path.join(this.coversPath, fileName);
      if (existsSync(coverPath)) {
        await fs.unlink(coverPath);
        this.logger.debug(`🗑️ Cover eliminado: ${fileName}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error eliminando cover ${fileName}:`, error);
    }
  }
}
