import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { AgentRegistryService } from '@features/external-metadata/infrastructure/services/agent-registry.service';
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
    private readonly prisma: PrismaService,
    private readonly agentRegistry: AgentRegistryService,
  ) {}

  async execute(input: SearchArtistAvatarsInput): Promise<SearchArtistAvatarsOutput> {
    // Get artist from database
    const artist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
    });

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

          const images = await agent.getArtistImages(mbzArtistId, artist.name);

          if (images) {
            const avatars: AvatarOption[] = [];

            // Profile images
            if (images.smallUrl) {
              avatars.push({
                provider: agent.name,
                url: images.smallUrl,
                type: 'profile',
                width: 174,
                height: 174,
              });
            }

            if (images.mediumUrl) {
              avatars.push({
                provider: agent.name,
                url: images.mediumUrl,
                thumbnailUrl: images.smallUrl || undefined,
                type: 'profile',
                width: 300,
                height: 300,
              });
            }

            if (images.largeUrl) {
              avatars.push({
                provider: agent.name,
                url: images.largeUrl,
                thumbnailUrl: images.mediumUrl || images.smallUrl || undefined,
                type: 'profile',
                width: 500,
                height: 500,
              });
            }

            // Background
            if (images.backgroundUrl) {
              avatars.push({
                provider: agent.name,
                url: images.backgroundUrl,
                thumbnailUrl: images.mediumUrl || images.smallUrl || undefined,
                type: 'background',
                width: 1920,
                height: 1080,
              });
            }

            // Banner
            if (images.bannerUrl) {
              avatars.push({
                provider: agent.name,
                url: images.bannerUrl,
                thumbnailUrl: images.mediumUrl || images.smallUrl || undefined,
                type: 'banner',
                width: 1000,
                height: 185,
              });
            }

            // Logo
            if (images.logoUrl) {
              avatars.push({
                provider: agent.name,
                url: images.logoUrl,
                type: 'logo',
                width: 400,
                height: 155,
              });
            }

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
