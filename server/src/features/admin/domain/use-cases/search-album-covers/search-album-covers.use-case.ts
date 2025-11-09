import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { AgentRegistryService } from '@features/external-metadata/infrastructure/services/agent-registry.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { IAlbumCoverRetriever } from '@features/external-metadata/domain/interfaces';
import {
  SearchAlbumCoversInput,
  SearchAlbumCoversOutput,
  CoverOption,
} from './search-album-covers.dto';

/**
 * SearchAlbumCoversUseCase
 * Searches all available providers for album cover options
 */
@Injectable()
export class SearchAlbumCoversUseCase {
  private readonly logger = new Logger(SearchAlbumCoversUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly imageDownload: ImageDownloadService,
  ) {}

  async execute(input: SearchAlbumCoversInput): Promise<SearchAlbumCoversOutput> {
    // Get album from database
    const album = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      include: { artist: true },
    });

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    const artistName = album.artist?.name || 'Unknown Artist';
    const mbzAlbumId = album.mbzAlbumId || null;
    const mbzArtistId = album.artist?.mbzArtistId || null;

    this.logger.log(
      `Searching covers for album: ${album.name} by ${artistName}`,
    );

    // Get all cover retrieval agents
    const agents = this.agentRegistry.getAgentsFor<IAlbumCoverRetriever>(
      'IAlbumCoverRetriever',
    );

    const allCovers: CoverOption[] = [];

    // Query all agents in parallel
    const results = await Promise.allSettled(
      agents.map(async (agent) => {
        try {
          this.logger.debug(`Trying agent "${agent.name}" for covers`);

          let cover;

          // Fanart.tv requires special handling with artist MBID
          if (
            agent.name === 'fanart' &&
            mbzArtistId &&
            mbzAlbumId
          ) {
            const fanartAgent = agent as any;
            if (fanartAgent.getAlbumCoverByArtist) {
              cover = await fanartAgent.getAlbumCoverByArtist(
                mbzArtistId,
                mbzAlbumId,
                artistName,
                album.name,
              );
            }
          } else {
            // Standard agents
            cover = await agent.getAlbumCover(
              mbzAlbumId,
              artistName,
              album.name,
            );
          }

          if (cover) {
            // Collect all URLs to probe
            const urlsToProbe: Array<{ url: string; sizeLabel: string }> = [];

            if (cover.smallUrl) {
              urlsToProbe.push({ url: cover.smallUrl, sizeLabel: 'small' });
            }
            if (cover.mediumUrl) {
              urlsToProbe.push({ url: cover.mediumUrl, sizeLabel: 'medium' });
            }
            if (cover.largeUrl) {
              urlsToProbe.push({ url: cover.largeUrl, sizeLabel: 'large' });
            }

            // Get real dimensions for each URL
            const covers: CoverOption[] = [];
            const seenDimensions = new Set<string>(); // Track seen dimensions to filter duplicates

            for (const { url, sizeLabel } of urlsToProbe) {
              try {
                const dimensions = await this.imageDownload.getImageDimensionsFromUrl(url);

                if (dimensions) {
                  // Create unique key for these dimensions
                  const dimensionKey = `${dimensions.width}x${dimensions.height}`;

                  // Only add if we haven't seen this exact dimension yet
                  if (!seenDimensions.has(dimensionKey)) {
                    seenDimensions.add(dimensionKey);

                    covers.push({
                      provider: agent.name,
                      url: url,
                      thumbnailUrl: sizeLabel === 'large' ? (cover.mediumUrl || cover.smallUrl) : undefined,
                      size: `${dimensions.width}x${dimensions.height}`, // Show real dimensions
                      width: dimensions.width,
                      height: dimensions.height,
                    });
                  } else {
                    this.logger.debug(
                      `Skipping duplicate dimensions ${dimensionKey} from ${agent.name} (${sizeLabel})`
                    );
                  }
                } else {
                  this.logger.warn(`Could not get dimensions for ${url} from ${agent.name}`);
                }
              } catch (error) {
                this.logger.warn(
                  `Failed to probe ${url} from ${agent.name}: ${(error as Error).message}`
                );
              }
            }

            return covers;
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
        allCovers.push(...result.value);
      }
    }

    this.logger.log(`Found ${allCovers.length} cover options from ${agents.length} providers`);

    return {
      covers: allCovers,
      albumInfo: {
        id: album.id,
        name: album.name,
        artistName,
        mbzAlbumId: mbzAlbumId || undefined,
      },
    };
  }
}
