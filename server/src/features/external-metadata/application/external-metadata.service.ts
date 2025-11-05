import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IArtistBioRetriever,
  IArtistImageRetriever,
  IAlbumCoverRetriever,
} from '../domain/interfaces';
import { ArtistBio, ArtistImages, AlbumCover } from '../domain/entities';
import { AgentRegistryService } from '../infrastructure/services/agent-registry.service';
import { MetadataCacheService } from '../infrastructure/services/metadata-cache.service';
import { StorageService } from '../infrastructure/services/storage.service';
import { ImageDownloadService } from '../infrastructure/services/image-download.service';
import { SettingsService } from '../infrastructure/services/settings.service';
import { MetadataConflictService, ConflictPriority } from '../infrastructure/services/metadata-conflict.service';
import * as path from 'path';

/**
 * External Metadata Service
 * Orchestrates metadata enrichment from multiple external sources
 *
 * Design Pattern: Facade Pattern + Chain of Responsibility
 * Purpose: Provide a unified interface for metadata enrichment with local storage
 */
@Injectable()
export class ExternalMetadataService {
  private readonly logger = new Logger(ExternalMetadataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly storage: StorageService,
    private readonly imageDownload: ImageDownloadService,
    private readonly settings: SettingsService,
    private readonly conflictService: MetadataConflictService
  ) {}

  /**
   * Enrich an artist with external metadata
   * Fetches biography and images from configured agents and downloads them locally
   *
   * @param artistId Internal artist ID
   * @param forceRefresh Skip cache and force fresh API calls
   * @returns Object with enrichment results
   */
  async enrichArtist(
    artistId: string,
    forceRefresh = false
  ): Promise<{
    bioUpdated: boolean;
    imagesUpdated: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let bioUpdated = false;
    let imagesUpdated = false;

    try {
      // Get artist from database
      const artist = await this.prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
      }

      this.logger.log(`Enriching artist: ${artist.name} (ID: ${artistId})`);

      // Enrich biography - Strategy based on source priority
      const bio = await this.getArtistBio(artist.mbzArtistId, artist.name, forceRefresh);
      if (bio) {
        const hasExistingBio = !!artist.biography;
        const isMusicBrainzSource = bio.source === 'musicbrainz';

        // Decision tree for applying vs creating conflict:
        // 1. No existing bio → Apply directly
        // 2. Has bio + forceRefresh → Apply directly (user explicitly requested)
        // 3. Has bio + MusicBrainz source → Apply directly (highest priority)
        // 4. Has bio + Other source (LastFM) → Create conflict for user review

        if (!hasExistingBio || forceRefresh || isMusicBrainzSource) {
          // Apply the biography directly
          await this.prisma.artist.update({
            where: { id: artistId },
            data: {
              biography: bio.content,
              biographySource: bio.source,
            },
          });
          bioUpdated = true;
          this.logger.log(`Updated biography for: ${artist.name} (source: ${bio.source})`);
        } else {
          // Create conflict for user to review
          await this.conflictService.createConflict({
            entityId: artistId,
            entityType: 'artist',
            field: 'biography',
            currentValue: artist.biography.substring(0, 200) + '...', // Preview only
            suggestedValue: bio.content.substring(0, 200) + '...', // Preview only
            source: bio.source as any,
            priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
            metadata: {
              artistName: artist.name,
              currentSource: artist.biographySource,
              fullBioLength: bio.content.length,
            },
          });
          this.logger.log(
            `Created conflict for artist "${artist.name}": existing bio vs ${bio.source} suggestion`
          );
        }
      }

      // Enrich images if not present or forceRefresh
      const needsImages =
        forceRefresh ||
        !artist.largeImageUrl ||
        !artist.backgroundImageUrl ||
        !artist.bannerImageUrl ||
        !artist.logoImageUrl;

      if (needsImages) {
        const images = await this.getArtistImages(artist.mbzArtistId, artist.name, forceRefresh);
        if (images) {
          // Download images locally
          const localPaths = await this.downloadArtistImages(artistId, images);

          const updateData: any = {};

          // Only update null fields unless forceRefresh
          if (forceRefresh || !artist.smallImageUrl) {
            updateData.smallImageUrl = localPaths.smallUrl;
          }
          if (forceRefresh || !artist.mediumImageUrl) {
            updateData.mediumImageUrl = localPaths.mediumUrl;
          }
          if (forceRefresh || !artist.largeImageUrl) {
            updateData.largeImageUrl = localPaths.largeUrl;
          }
          if (forceRefresh || !artist.backgroundImageUrl) {
            updateData.backgroundImageUrl = localPaths.backgroundUrl;
          }
          if (forceRefresh || !artist.bannerImageUrl) {
            updateData.bannerImageUrl = localPaths.bannerUrl;
          }
          if (forceRefresh || !artist.logoImageUrl) {
            updateData.logoImageUrl = localPaths.logoUrl;
          }

          // Update storage size
          updateData.metadataStorageSize = localPaths.totalSize;
          updateData.externalInfoUpdatedAt = new Date();

          if (Object.keys(updateData).length > 0) {
            await this.prisma.artist.update({
              where: { id: artistId },
              data: updateData,
            });
            imagesUpdated = true;
            this.logger.log(`Updated images for: ${artist.name} (${localPaths.totalSize} bytes)`);
          }
        }
      }

      return { bioUpdated, imagesUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching artist ${artistId}: ${(error as Error).message}`, (error as Error).stack);
      errors.push((error as Error).message);
      return { bioUpdated, imagesUpdated, errors };
    }
  }

  /**
   * Enrich an album with external metadata
   * Fetches cover art from configured agents and downloads it locally
   *
   * @param albumId Internal album ID
   * @param forceRefresh Skip cache and force fresh API calls
   * @returns Object with enrichment results
   */
  async enrichAlbum(
    albumId: string,
    forceRefresh = false
  ): Promise<{
    coverUpdated: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let coverUpdated = false;

    try {
      // Get album from database
      const album = await this.prisma.album.findUnique({
        where: { id: albumId },
        include: { artist: true },
      });

      if (!album) {
        throw new Error(`Album not found: ${albumId}`);
      }

      const artistName = album.artist?.name || 'Unknown Artist';
      this.logger.log(`Enriching album: ${album.name} by ${artistName} (ID: ${albumId})`);

      // Enrich cover - Strategy based on source priority
      // Validar que el álbum tenga MusicBrainz ID
      if (!album.mbzAlbumId) {
        this.logger.warn(
          `Album "${album.name}" (ID: ${albumId}) does not have MusicBrainz ID, skipping external cover enrichment`
        );
      } else {
        const cover = await this.getAlbumCover(
          album.mbzAlbumId,
          artistName,
          album.name,
          forceRefresh
        );

        if (cover) {
          const isMusicBrainzSource = cover.source === 'coverartarchive' || cover.source === 'musicbrainz';
          const hasExistingCover = !!album.externalCoverPath;

          // Decision tree for applying vs creating conflict:
          // 1. No existing cover → Apply directly
          // 2. Has cover + forceRefresh → Apply directly (user explicitly requested)
          // 3. Has cover + MusicBrainz source → Apply directly (highest priority)
          // 4. Has cover + Other source → Create conflict for user review

          if (!hasExistingCover || forceRefresh || isMusicBrainzSource) {
            // Apply the cover directly
            const localPath = await this.downloadAlbumCover(albumId, cover);

            await this.prisma.album.update({
              where: { id: albumId },
              data: {
                externalCoverPath: localPath,
                externalCoverSource: cover.source,
                externalInfoUpdatedAt: new Date(),
              },
            });
            coverUpdated = true;
            this.logger.log(`Updated cover for: ${album.name} (source: ${cover.source})`);
          } else {
            // Create conflict for user to review
            await this.conflictService.createConflict({
              entityId: albumId,
              entityType: 'album',
              field: 'externalCover',
              currentValue: album.externalCoverPath,
              suggestedValue: cover.url,
              source: cover.source as any,
              priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
              metadata: {
                albumName: album.name,
                artistName,
                currentSource: album.externalCoverSource,
              },
            });
            this.logger.log(
              `Created conflict for album "${album.name}": existing cover vs ${cover.source} suggestion`
            );
          }
        }
      }

      return { coverUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching album ${albumId}: ${(error as Error).message}`, (error as Error).stack);
      errors.push((error as Error).message);
      return { coverUpdated, errors };
    }
  }

  /**
   * Download artist images from external URLs and save locally
   * Returns local paths for all images
   */
  private async downloadArtistImages(
    artistId: string,
    images: ArtistImages
  ): Promise<{
    smallUrl: string | null;
    mediumUrl: string | null;
    largeUrl: string | null;
    backgroundUrl: string | null;
    bannerUrl: string | null;
    logoUrl: string | null;
    totalSize: number;
  }> {
    const basePath = await this.storage.getArtistMetadataPath(artistId);
    let totalSize = 0;

    const result = {
      smallUrl: null as string | null,
      mediumUrl: null as string | null,
      largeUrl: null as string | null,
      backgroundUrl: null as string | null,
      bannerUrl: null as string | null,
      logoUrl: null as string | null,
      totalSize: 0,
    };

    // Download profile images (small, medium, large)
    if (images.smallUrl) {
      try {
        const filePath = path.join(basePath, 'profile-small.jpg');
        await this.imageDownload.downloadAndSave(images.smallUrl, filePath);
        result.smallUrl = filePath;
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download small profile image: ${(error as Error).message}`);
      }
    }

    if (images.mediumUrl) {
      try {
        const filePath = path.join(basePath, 'profile-medium.jpg');
        await this.imageDownload.downloadAndSave(images.mediumUrl, filePath);
        result.mediumUrl = filePath;
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download medium profile image: ${(error as Error).message}`);
      }
    }

    if (images.largeUrl) {
      try {
        const filePath = path.join(basePath, 'profile-large.jpg');
        await this.imageDownload.downloadAndSave(images.largeUrl, filePath);
        result.largeUrl = filePath;
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download large profile image: ${(error as Error).message}`);
      }
    }

    // Download background (for Hero section)
    if (images.backgroundUrl) {
      try {
        const filePath = path.join(basePath, 'background.jpg');
        await this.imageDownload.downloadAndSave(images.backgroundUrl, filePath);
        result.backgroundUrl = filePath;
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download background image: ${(error as Error).message}`);
      }
    }

    // Download banner
    if (images.bannerUrl) {
      try {
        const filePath = path.join(basePath, 'banner.png');
        await this.imageDownload.downloadAndSave(images.bannerUrl, filePath);
        result.bannerUrl = filePath;
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download banner image: ${(error as Error).message}`);
      }
    }

    // Download logo
    if (images.logoUrl) {
      try {
        const filePath = path.join(basePath, 'logo.png');
        await this.imageDownload.downloadAndSave(images.logoUrl, filePath);
        result.logoUrl = filePath;
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download logo image: ${(error as Error).message}`);
      }
    }

    result.totalSize = totalSize;
    return result;
  }

  /**
   * Download album cover and save it
   * Saves to album folder as cover.jpg (if configured) or to metadata storage
   */
  private async downloadAlbumCover(
    albumId: string,
    cover: AlbumCover
  ): Promise<string> {
    const saveInFolder = await this.settings.getBoolean(
      'metadata.download.save_in_album_folder',
      true
    );

    let coverPath: string;

    if (saveInFolder) {
      // Get album to find its folder path
      const album = await this.prisma.album.findUnique({
        where: { id: albumId },
        include: {
          tracks: {
            take: 1,
            select: { path: true }
          }
        }
      });

      if (album && album.tracks.length > 0) {
        // Get album folder from first track path
        const albumFolder = path.dirname(album.tracks[0].path);
        coverPath = path.join(albumFolder, 'cover.jpg');
      } else {
        // Fallback to metadata storage
        const metadataPath = await this.storage.getAlbumMetadataPath(albumId);
        coverPath = path.join(metadataPath, 'cover.jpg');
      }
    } else {
      // Save to metadata storage
      const metadataPath = await this.storage.getAlbumMetadataPath(albumId);
      coverPath = path.join(metadataPath, 'cover.jpg');
    }

    // Download the best quality cover (large)
    await this.imageDownload.downloadAndSave(cover.largeUrl, coverPath);

    return coverPath;
  }

  /**
   * Get artist biography using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getArtistBio(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean
  ): Promise<ArtistBio | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.cache.get('artist', mbzArtistId || name, 'bio');
      if (cached) {
        return new ArtistBio(
          cached.content,
          cached.summary,
          cached.url,
          cached.source
        );
      }
    }

    // Try agents in priority order
    const agents = this.agentRegistry.getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever');

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for bio: ${name}`);
        const bio = await agent.getArtistBio(mbzArtistId, name);

        if (bio && bio.hasContent()) {
          // Cache the result
          await this.cache.set('artist', mbzArtistId || name, bio.source, {
            content: bio.content,
            summary: bio.summary,
            url: bio.url,
            source: bio.source,
          });

          return bio;
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for bio ${name}: ${(error as Error).message}`);
      }
    }

    this.logger.debug(`No biography found for: ${name}`);
    return null;
  }

  /**
   * Get artist images using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getArtistImages(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean
  ): Promise<ArtistImages | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.cache.get('artist', mbzArtistId || name, 'images');
      if (cached) {
        return new ArtistImages(
          cached.smallUrl,
          cached.mediumUrl,
          cached.largeUrl,
          cached.backgroundUrl,
          cached.bannerUrl,
          cached.logoUrl,
          cached.source
        );
      }
    }

    // Try agents in priority order
    const agents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>('IArtistImageRetriever');

    // Collect images from all agents and merge them
    let mergedImages: ArtistImages | null = null;

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for images: ${name}`);
        const images = await agent.getArtistImages(mbzArtistId, name);

        if (images) {
          if (!mergedImages) {
            mergedImages = images;
          } else {
            // Merge images (prefer existing values)
            mergedImages = new ArtistImages(
              mergedImages.smallUrl || images.smallUrl,
              mergedImages.mediumUrl || images.mediumUrl,
              mergedImages.largeUrl || images.largeUrl,
              mergedImages.backgroundUrl || images.backgroundUrl,
              mergedImages.bannerUrl || images.bannerUrl,
              mergedImages.logoUrl || images.logoUrl,
              `${mergedImages.source},${images.source}`
            );
          }

          // Stop if we have all image types
          if (mergedImages.hasHeroAssets() && mergedImages.getBestProfileUrl()) {
            break;
          }
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for images ${name}: ${(error as Error).message}`);
      }
    }

    if (mergedImages) {
      // Cache the merged result
      await this.cache.set('artist', mbzArtistId || name, mergedImages.source, {
        smallUrl: mergedImages.smallUrl,
        mediumUrl: mergedImages.mediumUrl,
        largeUrl: mergedImages.largeUrl,
        backgroundUrl: mergedImages.backgroundUrl,
        bannerUrl: mergedImages.bannerUrl,
        logoUrl: mergedImages.logoUrl,
        source: mergedImages.source,
      });

      return mergedImages;
    }

    this.logger.debug(`No images found for: ${name}`);
    return null;
  }

  /**
   * Get album cover using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getAlbumCover(
    mbzAlbumId: string | null,
    artist: string,
    album: string,
    forceRefresh: boolean
  ): Promise<AlbumCover | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.cache.get('album', mbzAlbumId || `${artist}:${album}`, 'cover');
      if (cached) {
        return new AlbumCover(
          cached.smallUrl,
          cached.mediumUrl,
          cached.largeUrl,
          cached.source
        );
      }
    }

    // Try agents in priority order
    const agents = this.agentRegistry.getAgentsFor<IAlbumCoverRetriever>('IAlbumCoverRetriever');

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for cover: ${artist} - ${album}`);
        const cover = await agent.getAlbumCover(mbzAlbumId, artist, album);

        if (cover) {
          // Cache the result
          await this.cache.set('album', mbzAlbumId || `${artist}:${album}`, cover.source, {
            smallUrl: cover.smallUrl,
            mediumUrl: cover.mediumUrl,
            largeUrl: cover.largeUrl,
            source: cover.source,
          });

          return cover;
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for cover ${artist} - ${album}: ${(error as Error).message}`);
      }
    }

    this.logger.debug(`No cover found for: ${artist} - ${album}`);
    return null;
  }
}
