import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Tipos de imágenes que puede detectar el LocalImageProvider
 */
export type LocalImageType = 'profile' | 'background' | 'banner' | 'logo';

/**
 * Resultado de búsqueda de imágenes locales
 */
export interface LocalArtistImages {
  profile?: string;
  background?: string;
  banner?: string;
  logo?: string;
}

/**
 * LocalImageProvider
 *
 * Servicio para detectar imágenes locales en carpetas de artistas
 * siguiendo naming conventions estilo Jellyfin.
 *
 * Prioridad de nombres (busca en orden):
 * - Profile: folder.jpg > folder.png > artist.jpg > artist.png > thumb.jpg > thumb.png
 * - Background: fanart.jpg > fanart.png > background.jpg > background.png > backdrop.jpg
 * - Logo: logo.png > logo.jpg > clearlogo.png
 * - Banner: banner.jpg > banner.png
 */
@Injectable()
export class LocalImageProvider {
  constructor(
    @InjectPinoLogger(LocalImageProvider.name)
    private readonly logger: PinoLogger,
  ) {}

  // Naming conventions (orden de prioridad)
  private readonly PROFILE_IMAGE_NAMES = [
    'folder.jpg',
    'folder.png',
    'folder.jpeg',
    'artist.jpg',
    'artist.png',
    'artist.jpeg',
    'thumb.jpg',
    'thumb.png',
    'thumb.jpeg',
  ];

  private readonly BACKGROUND_IMAGE_NAMES = [
    'fanart.jpg',
    'fanart.png',
    'fanart.jpeg',
    'background.jpg',
    'background.png',
    'background.jpeg',
    'backdrop.jpg',
    'backdrop.png',
    'backdrop.jpeg',
  ];

  private readonly LOGO_IMAGE_NAMES = [
    'logo.png',
    'logo.jpg',
    'logo.jpeg',
    'clearlogo.png',
    'clearlogo.jpg',
  ];

  private readonly BANNER_IMAGE_NAMES = [
    'banner.jpg',
    'banner.png',
    'banner.jpeg',
  ];

  /**
   * Busca imágenes locales en la carpeta de un artista
   * @param artistFolderPath Ruta absoluta a la carpeta del artista
   * @returns Objeto con rutas a las imágenes encontradas
   */
  async findImages(artistFolderPath: string): Promise<LocalArtistImages> {
    try {
      // Verificar que la carpeta existe
      const stats = await fs.stat(artistFolderPath);
      if (!stats.isDirectory()) {
        this.logger.warn(`Path is not a directory: ${artistFolderPath}`);
        return {};
      }

      // Leer archivos de la carpeta
      const files = await fs.readdir(artistFolderPath);
      const lowerCaseFiles = files.map(f => f.toLowerCase());

      this.logger.debug(`Scanning folder for local images: ${artistFolderPath}`);
      this.logger.debug(`Found ${files.length} files`);

      // Buscar cada tipo de imagen
      const result: LocalArtistImages = {};

      result.profile = this.findFirstMatch(
        files,
        lowerCaseFiles,
        this.PROFILE_IMAGE_NAMES,
        artistFolderPath
      );

      result.background = this.findFirstMatch(
        files,
        lowerCaseFiles,
        this.BACKGROUND_IMAGE_NAMES,
        artistFolderPath
      );

      result.logo = this.findFirstMatch(
        files,
        lowerCaseFiles,
        this.LOGO_IMAGE_NAMES,
        artistFolderPath
      );

      result.banner = this.findFirstMatch(
        files,
        lowerCaseFiles,
        this.BANNER_IMAGE_NAMES,
        artistFolderPath
      );

      // Log resultados
      const foundTypes = Object.entries(result)
        .filter(([_, path]) => path)
        .map(([type]) => type);

      if (foundTypes.length > 0) {
        this.logger.info(
          `Found local images for ${path.basename(artistFolderPath)}: ${foundTypes.join(', ')}`
        );
      } else {
        this.logger.debug(`No local images found in: ${artistFolderPath}`);
      }

      return result;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.debug(`Folder does not exist: ${artistFolderPath}`);
      } else {
        this.logger.error(`Error scanning folder ${artistFolderPath}: ${(error as Error).message}`);
      }
      return {};
    }
  }

  /**
   * Busca la primera coincidencia de una lista de nombres de archivo
   */
  private findFirstMatch(
    actualFiles: string[],
    lowerCaseFiles: string[],
    candidates: string[],
    baseFolder: string
  ): string | undefined {
    for (const candidate of candidates) {
      const index = lowerCaseFiles.indexOf(candidate.toLowerCase());
      if (index !== -1) {
        const foundFile = actualFiles[index];
        const fullPath = path.join(baseFolder, foundFile);
        this.logger.debug(`Matched ${candidate} → ${foundFile}`);
        return fullPath;
      }
    }
    return undefined;
  }

  /**
   * Verifica si un archivo de imagen existe
   */
  async imageExists(imagePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(imagePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Verifica si una ruta es una imagen válida (por extensión)
   */
  isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return validExtensions.includes(ext);
  }
}
