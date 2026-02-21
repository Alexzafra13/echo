import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AgentRegistryService } from '../../infrastructure/services/agent-registry.service';
import { IArtistImageRetriever, IAlbumCoverRetriever } from '../../domain/interfaces';
import { AlbumCover } from '../../domain/entities';

/**
 * Extended Fanart.tv artist image retriever with variant support
 */
interface FanartArtistAgent extends IArtistImageRetriever {
  getAllArtistImageVariants?: (
    mbid: string | null,
    name: string
  ) => Promise<{
    artistthumbs: string[];
    backgrounds: string[];
    banners: string[];
    logos: string[];
  } | null>;
}

/**
 * Extended Fanart.tv album cover retriever with variant and artist-based support
 */
interface FanartAlbumAgent extends IAlbumCoverRetriever {
  getAllAlbumCoverVariants?: (
    artistMbid: string,
    albumMbid: string,
    artistName: string,
    albumName: string
  ) => Promise<string[] | null>;
  getAlbumCoverByArtist?: (
    artistMbid: string,
    albumMbid: string,
    artistName: string,
    albumName: string
  ) => Promise<AlbumCover | null>;
}

/**
 * Common image option structure
 */
export interface ImageOption {
  provider: string;
  url: string;
  thumbnailUrl?: string;
  type?: 'profile' | 'background' | 'banner' | 'logo' | 'cover';
  width: number;
  height: number;
  size?: string;
}

/**
 * Artist image search input
 */
export interface ArtistImageSearchInput {
  artistName: string;
  mbzArtistId: string | null;
}

/**
 * Album cover search input
 */
export interface AlbumCoverSearchInput {
  albumName: string;
  artistName: string;
  mbzAlbumId: string | null;
  mbzArtistId: string | null;
}

/**
 * Fanart.tv dimension estimates (consistent across their API)
 */
const FANART_DIMENSIONS = {
  artistThumb: { width: 1000, height: 1000 },
  background: { width: 1920, height: 1080 },
  banner: { width: 1000, height: 185 },
  logo: { width: 800, height: 310 },
  albumCover: { width: 1000, height: 1000 },
};

/**
 * CoverArtArchive dimension estimates
 */
const COVER_ART_DIMENSIONS = {
  small: { width: 250, height: 250 },
  medium: { width: 500, height: 500 },
  large: { width: 1200, height: 1200 },
};

/**
 * Input type for addImageIfNew that allows null/undefined URLs
 */
interface ImageInputOption {
  provider: string;
  url: string | null | undefined;
  thumbnailUrl?: string | null;
  type?: 'profile' | 'background' | 'banner' | 'logo' | 'cover';
  width: number;
  height: number;
  size?: string;
}

/**
 * ImageSearchOrchestratorService
 *
 * Orchestrates parallel image searches across multiple providers.
 * Handles deduplication, dimension estimation, and result aggregation.
 */
@Injectable()
export class ImageSearchOrchestratorService {
  constructor(
    @InjectPinoLogger(ImageSearchOrchestratorService.name)
    private readonly logger: PinoLogger,
    private readonly agentRegistry: AgentRegistryService
  ) {}

  /**
   * Search for artist images across all providers
   */
  async searchArtistImages(input: ArtistImageSearchInput): Promise<ImageOption[]> {
    const { artistName, mbzArtistId } = input;

    this.logger.info(`Searching images for artist: ${artistName}`);

    const agents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>('IArtistImageRetriever');

    const allImages: ImageOption[] = [];
    const seenUrls = new Set<string>();

    const results = await Promise.allSettled(
      agents.map((agent) =>
        this.fetchArtistImagesFromAgent(agent, artistName, mbzArtistId, seenUrls)
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allImages.push(...result.value);
      }
    }

    this.logger.info(`Found ${allImages.length} image options from ${agents.length} providers`);

    return allImages;
  }

  /**
   * Search for album covers across all providers
   */
  async searchAlbumCovers(input: AlbumCoverSearchInput): Promise<ImageOption[]> {
    const { albumName, artistName, mbzAlbumId, mbzArtistId } = input;

    this.logger.info(`Searching covers for album: ${albumName} by ${artistName}`);

    const agents = this.agentRegistry.getAgentsFor<IAlbumCoverRetriever>('IAlbumCoverRetriever');

    const allCovers: ImageOption[] = [];
    const seenUrls = new Set<string>();

    const results = await Promise.allSettled(
      agents.map((agent) =>
        this.fetchAlbumCoversFromAgent(
          agent,
          albumName,
          artistName,
          mbzAlbumId,
          mbzArtistId,
          seenUrls
        )
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allCovers.push(...result.value);
      }
    }

    this.logger.info(`Found ${allCovers.length} cover options from ${agents.length} providers`);

    return allCovers;
  }

  /**
   * Fetch artist images from a single agent
   */
  private async fetchArtistImagesFromAgent(
    agent: IArtistImageRetriever,
    artistName: string,
    mbzArtistId: string | null,
    seenUrls: Set<string>
  ): Promise<ImageOption[]> {
    try {
      this.logger.debug(`Trying agent "${agent.name}" for artist images`);
      const images: ImageOption[] = [];

      // Special handling for Fanart.tv variants
      if (agent.name === 'fanart' && mbzArtistId) {
        const fanartImages = await this.fetchFanartArtistVariants(
          agent,
          artistName,
          mbzArtistId,
          seenUrls
        );
        if (fanartImages.length > 0) {
          return fanartImages;
        }
      }

      // Standard handling for other agents
      const result = await agent.getArtistImages(mbzArtistId, artistName);
      if (!result) return [];

      // Add profile images
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url: result.smallUrl,
        type: 'profile',
        ...this.estimateProfileDimensions('small'),
      });

      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url: result.mediumUrl,
        thumbnailUrl: result.smallUrl || undefined,
        type: 'profile',
        ...this.estimateProfileDimensions('medium'),
      });

      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url: result.largeUrl,
        thumbnailUrl: result.mediumUrl || result.smallUrl || undefined,
        type: 'profile',
        ...this.estimateProfileDimensions('large'),
      });

      // Add background
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url: result.backgroundUrl,
        thumbnailUrl: result.mediumUrl || result.smallUrl || undefined,
        type: 'background',
        width: 1920,
        height: 1080,
      });

      // Add banner
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url: result.bannerUrl,
        thumbnailUrl: result.mediumUrl || result.smallUrl || undefined,
        type: 'banner',
        width: 1000,
        height: 185,
      });

      // Add logo
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url: result.logoUrl,
        type: 'logo',
        width: 800,
        height: 310,
      });

      this.logger.info(`Agent "${agent.name}" contributed ${images.length} images`);
      return images;
    } catch (error) {
      this.logger.warn(`Agent "${agent.name}" failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Fetch all Fanart.tv artist image variants
   */
  private async fetchFanartArtistVariants(
    agent: IArtistImageRetriever,
    artistName: string,
    mbzArtistId: string,
    seenUrls: Set<string>
  ): Promise<ImageOption[]> {
    const fanartAgent = agent as FanartArtistAgent;
    if (!fanartAgent.getAllArtistImageVariants) return [];

    const variants = await fanartAgent.getAllArtistImageVariants(mbzArtistId, artistName);
    if (!variants) return [];

    const images: ImageOption[] = [];

    // Artist thumbs
    for (const url of variants.artistthumbs) {
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url,
        type: 'profile',
        ...FANART_DIMENSIONS.artistThumb,
      });
    }

    // Backgrounds
    for (const url of variants.backgrounds) {
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url,
        type: 'background',
        ...FANART_DIMENSIONS.background,
      });
    }

    // Banners
    for (const url of variants.banners) {
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url,
        type: 'banner',
        ...FANART_DIMENSIONS.banner,
      });
    }

    // Logos
    for (const url of variants.logos) {
      this.addImageIfNew(images, seenUrls, {
        provider: agent.name,
        url,
        type: 'logo',
        ...FANART_DIMENSIONS.logo,
      });
    }

    this.logger.info(`Agent "${agent.name}" contributed ${images.length} images from variants`);
    return images;
  }

  /**
   * Fetch album covers from a single agent
   */
  private async fetchAlbumCoversFromAgent(
    agent: IAlbumCoverRetriever,
    albumName: string,
    artistName: string,
    mbzAlbumId: string | null,
    mbzArtistId: string | null,
    seenUrls: Set<string>
  ): Promise<ImageOption[]> {
    try {
      this.logger.debug(`Trying agent "${agent.name}" for album covers`);
      const covers: ImageOption[] = [];

      // Special handling for Fanart.tv variants
      if (agent.name === 'fanart' && mbzArtistId && mbzAlbumId) {
        const fanartCovers = await this.fetchFanartAlbumVariants(
          agent,
          albumName,
          artistName,
          mbzAlbumId,
          mbzArtistId,
          seenUrls
        );
        if (fanartCovers.length > 0) {
          return fanartCovers;
        }
      }

      // Standard handling
      let cover;
      if (agent.name === 'fanart' && mbzArtistId && mbzAlbumId) {
        const fanartAgent = agent as FanartAlbumAgent;
        if (fanartAgent.getAlbumCoverByArtist) {
          cover = await fanartAgent.getAlbumCoverByArtist(
            mbzArtistId,
            mbzAlbumId,
            artistName,
            albumName
          );
        }
      } else {
        cover = await agent.getAlbumCover(mbzAlbumId, artistName, albumName);
      }

      if (!cover) return [];

      // Add cover sizes
      if (cover.smallUrl) {
        this.addImageIfNew(covers, seenUrls, {
          provider: agent.name,
          url: cover.smallUrl,
          type: 'cover',
          size: '250x250 (small, est.)',
          ...COVER_ART_DIMENSIONS.small,
        });
      }

      if (cover.mediumUrl) {
        this.addImageIfNew(covers, seenUrls, {
          provider: agent.name,
          url: cover.mediumUrl,
          type: 'cover',
          size: '500x500 (medium, est.)',
          ...COVER_ART_DIMENSIONS.medium,
        });
      }

      if (cover.largeUrl) {
        this.addImageIfNew(covers, seenUrls, {
          provider: agent.name,
          url: cover.largeUrl,
          thumbnailUrl: cover.mediumUrl || cover.smallUrl,
          type: 'cover',
          size: '1200x1200 (large, est.)',
          ...COVER_ART_DIMENSIONS.large,
        });
      }

      this.logger.info(`Agent "${agent.name}" contributed ${covers.length} covers`);
      return covers;
    } catch (error) {
      this.logger.warn(`Agent "${agent.name}" failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Fetch all Fanart.tv album cover variants
   */
  private async fetchFanartAlbumVariants(
    agent: IAlbumCoverRetriever,
    albumName: string,
    artistName: string,
    mbzAlbumId: string,
    mbzArtistId: string,
    seenUrls: Set<string>
  ): Promise<ImageOption[]> {
    const fanartAgent = agent as FanartAlbumAgent;
    if (!fanartAgent.getAllAlbumCoverVariants) return [];

    const variants = await fanartAgent.getAllAlbumCoverVariants(
      mbzArtistId,
      mbzAlbumId,
      artistName,
      albumName
    );

    if (!variants || variants.length === 0) return [];

    const covers: ImageOption[] = [];
    for (const url of variants) {
      this.addImageIfNew(covers, seenUrls, {
        provider: agent.name,
        url,
        type: 'cover',
        size: '1000x1000 (est.)',
        ...FANART_DIMENSIONS.albumCover,
      });
    }

    this.logger.info(`Agent "${agent.name}" contributed ${covers.length} covers from variants`);
    return covers;
  }

  /**
   * Add image to collection if URL is new
   */
  private addImageIfNew(
    images: ImageOption[],
    seenUrls: Set<string>,
    option: ImageInputOption
  ): void {
    if (!option.url || seenUrls.has(option.url)) return;

    seenUrls.add(option.url);
    images.push({
      provider: option.provider,
      url: option.url,
      thumbnailUrl: option.thumbnailUrl ?? undefined,
      type: option.type,
      width: option.width,
      height: option.height,
      size: option.size,
    });
  }

  /**
   * Estimate profile image dimensions based on size label
   */
  private estimateProfileDimensions(size: 'small' | 'medium' | 'large'): {
    width: number;
    height: number;
  } {
    switch (size) {
      case 'small':
        return { width: 64, height: 64 };
      case 'medium':
        return { width: 174, height: 174 };
      case 'large':
        return { width: 300, height: 300 };
    }
  }
}
