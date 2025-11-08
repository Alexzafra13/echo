import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { AgentRegistryService } from '@features/external-metadata/infrastructure/services/agent-registry.service';
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
            // Add all available sizes
            const covers: CoverOption[] = [];

            if (cover.smallUrl) {
              covers.push({
                provider: agent.name,
                url: cover.smallUrl,
                size: 'small',
                width: 250,
                height: 250,
              });
            }

            if (cover.mediumUrl) {
              covers.push({
                provider: agent.name,
                url: cover.mediumUrl,
                size: 'medium',
                width: 500,
                height: 500,
              });
            }

            if (cover.largeUrl) {
              covers.push({
                provider: agent.name,
                url: cover.largeUrl,
                thumbnailUrl: cover.mediumUrl || cover.smallUrl,
                size: 'large',
                width: 1200,
                height: 1200,
              });
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
