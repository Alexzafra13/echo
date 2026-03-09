import { Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums } from '@infrastructure/database/schema';
import { eq, or, isNotNull, isNull } from 'drizzle-orm';
import { StorageService } from '../infrastructure/services/storage.service';
import { normalizeForSorting } from '@shared/utils';
import * as fs from 'fs/promises';
import * as path from 'path';

// Sincronización de datos: limpieza de URLs, sync de imágenes, sort names (solo admin)
@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class DataSyncController {
  constructor(
    @InjectPinoLogger(DataSyncController.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService
  ) {}

  // Limpia URLs incorrectas (file://, /api/) para permitir re-enriquecimiento
  @Post('clean/artist-image-urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean incorrect artist image URLs',
    description:
      'Removes incorrect image URLs (file:// paths or API URLs) from the database. ' +
      'After cleaning, artists can be re-enriched to download images correctly (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaning result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        cleaned: { type: 'number', description: 'Number of artists cleaned' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async cleanArtistImageUrls() {
    const startTime = Date.now();
    const errors: string[] = [];
    let cleaned = 0;

    try {
      this.logger.info('Starting artist image URL cleanup');

      // Get all artists with incorrect image URLs
      const artistsWithPaths = await this.drizzle.db
        .select({
          id: artists.id,
          name: artists.name,
          externalProfilePath: artists.externalProfilePath,
          externalBackgroundPath: artists.externalBackgroundPath,
          externalBannerPath: artists.externalBannerPath,
          externalLogoPath: artists.externalLogoPath,
        })
        .from(artists)
        .where(
          or(
            isNotNull(artists.externalProfilePath),
            isNotNull(artists.externalBackgroundPath),
            isNotNull(artists.externalBannerPath),
            isNotNull(artists.externalLogoPath)
          )
        );

      this.logger.info(`Found ${artistsWithPaths.length} artists with image URLs`);

      // Clean each artist that has incorrect URLs
      for (const artist of artistsWithPaths) {
        try {
          const updates: Partial<typeof artists.$inferInsert> = {};
          let needsCleaning = false;

          // Clean URLs that start with file:// or /api/ (these are incorrect - should be file system paths)
          if (
            artist.externalProfilePath &&
            (artist.externalProfilePath.startsWith('file://') ||
              artist.externalProfilePath.startsWith('/api/'))
          ) {
            updates.externalProfilePath = null;
            needsCleaning = true;
          }

          if (
            artist.externalBackgroundPath &&
            (artist.externalBackgroundPath.startsWith('file://') ||
              artist.externalBackgroundPath.startsWith('/api/'))
          ) {
            updates.externalBackgroundPath = null;
            needsCleaning = true;
          }

          if (
            artist.externalBannerPath &&
            (artist.externalBannerPath.startsWith('file://') ||
              artist.externalBannerPath.startsWith('/api/'))
          ) {
            updates.externalBannerPath = null;
            needsCleaning = true;
          }

          if (
            artist.externalLogoPath &&
            (artist.externalLogoPath.startsWith('file://') ||
              artist.externalLogoPath.startsWith('/api/'))
          ) {
            updates.externalLogoPath = null;
            needsCleaning = true;
          }

          if (needsCleaning) {
            await this.drizzle.db.update(artists).set(updates).where(eq(artists.id, artist.id));
            cleaned++;
            this.logger.debug(`Cleaned: ${artist.name}`);
          }
        } catch (error) {
          const errorMsg = `Failed to clean artist ${artist.name}: ${(error as Error).message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(
        `Cleanup completed: ${cleaned} artists cleaned, ${errors.length} errors in ${duration}ms`
      );

      return {
        success: errors.length === 0,
        cleaned,
        errors,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error during artist image URL cleanup: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  // Sincroniza DB con archivos físicos existentes en storage
  @Post('sync/artist-images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync database with physical image files',
    description:
      'Scans the storage directory for existing image files and updates database with correct file paths. ' +
      'Use this after cleaning to restore references to physically existing files (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        synced: { type: 'number', description: 'Number of artists synced' },
        filesFound: { type: 'number', description: 'Total image files found' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async syncArtistImages() {
    const startTime = Date.now();
    const errors: string[] = [];
    let synced = 0;
    let filesFound = 0;

    try {
      this.logger.info('Starting artist image synchronization');

      // Get base storage path
      const basePath = await this.storage.getBasePath();
      const artistsPath = path.join(basePath, 'artists');

      // Check if artists directory exists
      const artistsDirExists = await this.storage.directoryExists(artistsPath);
      if (!artistsDirExists) {
        this.logger.warn('Artists directory does not exist in storage');
        return {
          success: true,
          synced: 0,
          filesFound: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Get all artist directories
      const artistDirs = await fs.readdir(artistsPath, { withFileTypes: true });

      // OPTIMIZATION: Batch load all artists to avoid N+1 query
      const artistIds = artistDirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name);

      const { inArray } = await import('drizzle-orm');
      const artistsData = await this.drizzle.db
        .select({
          id: artists.id,
          name: artists.name,
          externalProfilePath: artists.externalProfilePath,
          externalBackgroundPath: artists.externalBackgroundPath,
          externalBannerPath: artists.externalBannerPath,
          externalLogoPath: artists.externalLogoPath,
        })
        .from(artists)
        .where(inArray(artists.id, artistIds));

      // Create map for O(1) lookups
      const artistMap = new Map(artistsData.map((a) => [a.id, a]));

      for (const dir of artistDirs) {
        if (!dir.isDirectory()) continue;

        const artistId = dir.name;
        const artistPath = path.join(artistsPath, artistId);

        try {
          // Check if artist exists in database using map
          const artist = artistMap.get(artistId);

          if (!artist) {
            this.logger.debug(`Artist ${artistId} not found in database, skipping`);
            continue;
          }

          // Check for image files
          const updates: Partial<typeof artists.$inferInsert> = {};
          let hasUpdates = false;

          const imageFiles = [
            { file: 'profile.jpg', field: 'externalProfilePath' as const },
            { file: 'background.jpg', field: 'externalBackgroundPath' as const },
            { file: 'banner.png', field: 'externalBannerPath' as const },
            { file: 'logo.png', field: 'externalLogoPath' as const },
          ];

          for (const { file, field } of imageFiles) {
            const filePath = path.join(artistPath, file);
            const exists = await this.storage.fileExists(filePath);

            if (exists) {
              filesFound++;
              // Only update if database field is null or empty
              if (!artist[field]) {
                updates[field] = filePath;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            await this.drizzle.db.update(artists).set(updates).where(eq(artists.id, artistId));
            synced++;
            this.logger.debug(`Synced: ${artist.name} (${Object.keys(updates).length} images)`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync artist ${artistId}: ${(error as Error).message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(
        `Synchronization completed: ${synced} artists synced, ${filesFound} files found, ${errors.length} errors in ${duration}ms`
      );

      return {
        success: errors.length === 0,
        synced,
        filesFound,
        errors,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error during image synchronization: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  // Genera campos de ordenación para registros existentes (migración)
  @Post('populate-sort-names')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Populate sorting names for existing albums and artists',
    description:
      'Auto-generates orderAlbumName and orderArtistName for existing records. ' +
      'This is needed once after migration to enable alphabetical sorting (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Population result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        albumsUpdated: { type: 'number' },
        artistsUpdated: { type: 'number' },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async populateSortNames() {
    const startTime = Date.now();

    try {
      this.logger.info('Starting population of sort names');

      // Get all albums without orderAlbumName
      const albumsToUpdate = await this.drizzle.db
        .select({ id: albums.id, name: albums.name })
        .from(albums)
        .where(or(isNull(albums.orderAlbumName), eq(albums.orderAlbumName, '')));

      // Get all artists without orderArtistName
      const artistsToUpdate = await this.drizzle.db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(or(isNull(artists.orderArtistName), eq(artists.orderArtistName, '')));

      this.logger.info(
        `Found ${albumsToUpdate.length} albums and ${artistsToUpdate.length} artists to update`
      );

      // Update albums in batches
      let albumsUpdated = 0;
      for (const album of albumsToUpdate) {
        try {
          await this.drizzle.db
            .update(albums)
            .set({ orderAlbumName: normalizeForSorting(album.name) })
            .where(eq(albums.id, album.id));
          albumsUpdated++;
        } catch (error) {
          this.logger.error(`Failed to update album ${album.id}: ${(error as Error).message}`);
        }
      }

      // Update artists in batches
      let artistsUpdated = 0;
      for (const artist of artistsToUpdate) {
        try {
          await this.drizzle.db
            .update(artists)
            .set({ orderArtistName: normalizeForSorting(artist.name) })
            .where(eq(artists.id, artist.id));
          artistsUpdated++;
        } catch (error) {
          this.logger.error(`Failed to update artist ${artist.id}: ${(error as Error).message}`);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(
        `Sort names populated: ${albumsUpdated} albums, ${artistsUpdated} artists in ${duration}ms`
      );

      return {
        success: true,
        albumsUpdated,
        artistsUpdated,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error populating sort names: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }
}
