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

/**
 * External Metadata Service
 * Orchestrates metadata enrichment from multiple external sources
 *
 * Design Pattern: Facade Pattern + Chain of Responsibility
 * Purpose: Provide a unified interface for metadata enrichment
 */
@Injectable()
export class ExternalMetadataService {
  private readonly logger = new Logger(ExternalMetadataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService
  ) {}

  /**
   * Enrich an artist with external metadata
   * Fetches biography and images from configured agents
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

      // Enrich biography if not present or forceRefresh
      if (forceRefresh || !artist.biography) {
        const bio = await this.getArtistBio(artist.mbid, artist.name, forceRefresh);
        if (bio) {
          await this.prisma.artist.update({
            where: { id: artistId },
            data: {
              biography: bio.content,
              biography_source: bio.source,
            },
          });
          bioUpdated = true;
          this.logger.log(`Updated biography for: ${artist.name}`);
        }
      }

      // Enrich images if not present or forceRefresh
      const needsImages =
        forceRefresh ||
        !artist.image_url ||
        !artist.background_image_url ||
        !artist.banner_image_url ||
        !artist.logo_image_url;

      if (needsImages) {
        const images = await this.getArtistImages(artist.mbid, artist.name, forceRefresh);
        if (images) {
          const updateData: any = {};

          // Only update null fields unless forceRefresh
          if (forceRefresh || !artist.image_url) {
            updateData.image_url = images.getBestProfileUrl();
          }
          if (forceRefresh || !artist.background_image_url) {
            updateData.background_image_url = images.backgroundUrl;
          }
          if (forceRefresh || !artist.banner_image_url) {
            updateData.banner_image_url = images.bannerUrl;
          }
          if (forceRefresh || !artist.logo_image_url) {
            updateData.logo_image_url = images.logoUrl;
          }

          if (Object.keys(updateData).length > 0) {
            await this.prisma.artist.update({
              where: { id: artistId },
              data: updateData,
            });
            imagesUpdated = true;
            this.logger.log(`Updated images for: ${artist.name}`);
          }
        }
      }

      return { bioUpdated, imagesUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching artist ${artistId}: ${error.message}`, error.stack);
      errors.push(error.message);
      return { bioUpdated, imagesUpdated, errors };
    }
  }

  /**
   * Enrich an album with external metadata
   * Fetches cover art from configured agents
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

      this.logger.log(`Enriching album: ${album.title} by ${album.artist.name} (ID: ${albumId})`);

      // Enrich cover if not present or forceRefresh
      if (forceRefresh || !album.cover_image) {
        const cover = await this.getAlbumCover(
          album.mbid,
          album.artist.name,
          album.title,
          forceRefresh
        );

        if (cover) {
          await this.prisma.album.update({
            where: { id: albumId },
            data: {
              cover_image: cover.largeUrl,
            },
          });
          coverUpdated = true;
          this.logger.log(`Updated cover for: ${album.title}`);
        }
      }

      return { coverUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching album ${albumId}: ${error.message}`, error.stack);
      errors.push(error.message);
      return { coverUpdated, errors };
    }
  }

  /**
   * Get artist biography using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getArtistBio(
    mbid: string | null,
    name: string,
    forceRefresh: boolean
  ): Promise<ArtistBio | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.cache.get('artist', mbid || name, 'bio');
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
        const bio = await agent.getArtistBio(mbid, name);

        if (bio && bio.hasContent()) {
          // Cache the result
          await this.cache.set('artist', mbid || name, 'bio', {
            content: bio.content,
            summary: bio.summary,
            url: bio.url,
            source: bio.source,
          }, bio.source);

          return bio;
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for bio ${name}: ${error.message}`);
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
    mbid: string | null,
    name: string,
    forceRefresh: boolean
  ): Promise<ArtistImages | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.cache.get('artist', mbid || name, 'images');
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
        const images = await agent.getArtistImages(mbid, name);

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
        this.logger.warn(`Agent "${agent.name}" failed for images ${name}: ${error.message}`);
      }
    }

    if (mergedImages) {
      // Cache the merged result
      await this.cache.set('artist', mbid || name, 'images', {
        smallUrl: mergedImages.smallUrl,
        mediumUrl: mergedImages.mediumUrl,
        largeUrl: mergedImages.largeUrl,
        backgroundUrl: mergedImages.backgroundUrl,
        bannerUrl: mergedImages.bannerUrl,
        logoUrl: mergedImages.logoUrl,
        source: mergedImages.source,
      }, mergedImages.source);

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
    mbid: string | null,
    artist: string,
    album: string,
    forceRefresh: boolean
  ): Promise<AlbumCover | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.cache.get('album', mbid || `${artist}:${album}`, 'cover');
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
        const cover = await agent.getAlbumCover(mbid, artist, album);

        if (cover) {
          // Cache the result
          await this.cache.set('album', mbid || `${artist}:${album}`, 'cover', {
            smallUrl: cover.smallUrl,
            mediumUrl: cover.mediumUrl,
            largeUrl: cover.largeUrl,
            source: cover.source,
          }, cover.source);

          return cover;
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for cover ${artist} - ${album}: ${error.message}`);
      }
    }

    this.logger.debug(`No cover found for: ${artist} - ${album}`);
    return null;
  }
}
