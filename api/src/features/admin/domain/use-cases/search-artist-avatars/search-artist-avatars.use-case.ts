import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists } from '@infrastructure/database/schema';
import { AgentRegistryService } from '@features/external-metadata/infrastructure/services/agent-registry.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { IArtistImageRetriever } from '@features/external-metadata/domain/interfaces';
import {
  SearchArtistAvatarsInput,
  SearchArtistAvatarsOutput,
  AvatarOption,
} from './search-artist-avatars.dto';

/**
 * SearchArtistAvatarsUseCase
 * Searches all available providers for artist avatar/image options
 */
@Injectable()
export class SearchArtistAvatarsUseCase {
  private readonly logger = new Logger(SearchArtistAvatarsUseCase.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly imageDownload: ImageDownloadService,
  ) {}

  async execute(input: SearchArtistAvatarsInput): Promise<SearchArtistAvatarsOutput> {
    // Get artist from database
    const artistResult = await this.drizzle.db
      .select()
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    const mbzArtistId = artist.mbzArtistId || null;

    this.logger.log(`Searching avatars for artist: ${artist.name}`);

    // Get all image retrieval agents
    const agents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>(
      'IArtistImageRetriever',
    );

    const allAvatars: AvatarOption[] = [];

    // Query all agents in parallel
    const results = await Promise.allSettled(
      agents.map(async (agent) => {
        try {
          this.logger.debug(`Trying agent "${agent.name}" for avatars`);

          const avatars: AvatarOption[] = [];
          const seenDimensions = new Map<string, Set<string>>(); // Track dimensions per type
          const seenUrls = new Set<string>(); // Track all URLs to avoid duplicate probes

          // Helper function to add image with real dimensions
          const addImage = async (
            url: string | null,
            type: 'profile' | 'background' | 'banner' | 'logo',
            sizeLabel: string,
            thumbnailUrl?: string
          ) => {
            if (!url) return;

            // Skip if we've already probed this URL
            if (seenUrls.has(url)) {
              this.logger.debug(
                `Skipping duplicate URL from ${agent.name} (${type}/${sizeLabel})`
              );
              return;
            }
            seenUrls.add(url);

            try {
              this.logger.debug(
                `Probing ${agent.name} ${type} (${sizeLabel}): ${url.substring(0, 80)}...`
              );
              const dimensions = await this.imageDownload.getImageDimensionsFromUrl(url);

              if (dimensions) {
                const dimensionKey = `${dimensions.width}x${dimensions.height}`;

                // Initialize set for this type if needed
                if (!seenDimensions.has(type)) {
                  seenDimensions.set(type, new Set<string>());
                }

                const typeDimensions = seenDimensions.get(type)!;

                // Only add if we haven't seen this dimension for this type
                if (!typeDimensions.has(dimensionKey)) {
                  typeDimensions.add(dimensionKey);

                  avatars.push({
                    provider: agent.name,
                    url: url,
                    thumbnailUrl: thumbnailUrl,
                    type: type,
                    width: dimensions.width,
                    height: dimensions.height,
                  });

                  this.logger.log(
                    `✓ Added ${agent.name} ${type}: ${dimensionKey} from ${sizeLabel}`
                  );
                } else {
                  this.logger.debug(
                    `Skipping duplicate ${type} dimensions ${dimensionKey} from ${agent.name} (${sizeLabel})`
                  );
                }
              } else {
                this.logger.warn(
                  `Could not get dimensions for ${type} from ${agent.name} (${sizeLabel})`
                );
              }
            } catch (error) {
              this.logger.warn(
                `Failed to probe ${type} from ${agent.name} (${sizeLabel}): ${(error as Error).message}`
              );
            }
          };

          // Special handling for Fanart.tv to get ALL variants
          if (agent.name === 'fanart' && mbzArtistId) {
            const fanartAgent = agent as any;

            if (fanartAgent.getAllArtistImageVariants) {
              this.logger.debug(`Getting ALL Fanart.tv variants for ${artist.name}`);

              const variants = await fanartAgent.getAllArtistImageVariants(
                mbzArtistId,
                artist.name
              );

              if (variants) {
                // Use estimated dimensions like Jellyfin does (no probing for performance)
                // Fanart.tv image dimensions are fairly consistent by type

                // Artist thumbs - typically 1000x1000
                for (let i = 0; i < variants.artistthumbs.length; i++) {
                  const url = variants.artistthumbs[i];
                  if (!seenUrls.has(url)) {
                    seenUrls.add(url);
                    avatars.push({
                      provider: agent.name,
                      url: url,
                      type: 'profile',
                      width: 1000,
                      height: 1000,
                    });
                  }
                }

                // Backgrounds - typically 1920x1080
                for (let i = 0; i < variants.backgrounds.length; i++) {
                  const url = variants.backgrounds[i];
                  if (!seenUrls.has(url)) {
                    seenUrls.add(url);
                    avatars.push({
                      provider: agent.name,
                      url: url,
                      type: 'background',
                      width: 1920,
                      height: 1080,
                    });
                  }
                }

                // Banners - typically 1000x185
                for (let i = 0; i < variants.banners.length; i++) {
                  const url = variants.banners[i];
                  if (!seenUrls.has(url)) {
                    seenUrls.add(url);
                    avatars.push({
                      provider: agent.name,
                      url: url,
                      type: 'banner',
                      width: 1000,
                      height: 185,
                    });
                  }
                }

                // Logos - HD logos are typically 800x310, regular logos 400x155
                // Since we mix HD and regular, we'll use HD dimensions as default
                for (let i = 0; i < variants.logos.length; i++) {
                  const url = variants.logos[i];
                  if (!seenUrls.has(url)) {
                    seenUrls.add(url);
                    // Use HD dimensions (800x310) for estimated size
                    avatars.push({
                      provider: agent.name,
                      url: url,
                      type: 'logo',
                      width: 800,
                      height: 310,
                    });
                  }
                }

                this.logger.log(
                  `Agent "${agent.name}" contributed ${avatars.length} unique avatars from all variants`
                );

                return avatars;
              }
            }
          }

          // Standard handling for other agents (Last.fm, etc.)
          const images = await agent.getArtistImages(mbzArtistId, artist.name);

          if (images) {
            // Profile images (small, medium, large)
            await addImage(images.smallUrl, 'profile', 'small');
            await addImage(images.mediumUrl, 'profile', 'medium', images.smallUrl || undefined);
            await addImage(images.largeUrl, 'profile', 'large', images.mediumUrl || images.smallUrl || undefined);

            // Background
            await addImage(
              images.backgroundUrl,
              'background',
              'hd',
              images.mediumUrl || images.smallUrl || undefined
            );

            // Banner
            await addImage(
              images.bannerUrl,
              'banner',
              'banner',
              images.mediumUrl || images.smallUrl || undefined
            );

            // Logo
            await addImage(images.logoUrl, 'logo', 'logo');

            this.logger.log(
              `Agent "${agent.name}" contributed ${avatars.length} unique avatars`
            );

            return avatars;
          }

          return [];
        } catch (error) {
          this.logger.warn(
            `Agent "${agent.name}" failed: ${(error as Error).message}`,
          );
          return [];
        }
      }),
    );

    // Collect all successful results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allAvatars.push(...result.value);
      }
    }

    this.logger.log(
      `Found ${allAvatars.length} avatar options from ${agents.length} providers`,
    );

    return {
      avatars: allAvatars,
      artistInfo: {
        id: artist.id,
        name: artist.name,
        mbzArtistId: mbzArtistId || undefined,
      },
    };
  }
}
