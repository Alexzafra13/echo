import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import {
  UpdateArtistBackgroundPositionInput,
  UpdateArtistBackgroundPositionOutput,
} from './update-artist-background-position.dto';

/**
 * UpdateArtistBackgroundPositionUseCase
 * Updates the background position preference for an artist
 */
@Injectable()
export class UpdateArtistBackgroundPositionUseCase {
  private readonly logger = new Logger(UpdateArtistBackgroundPositionUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(
    input: UpdateArtistBackgroundPositionInput,
  ): Promise<UpdateArtistBackgroundPositionOutput> {
    // Get artist from database
    const artist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    this.logger.log(
      `Updating background position for artist: ${artist.name} to "${input.backgroundPosition}"`,
    );

    // Update the background position
    await this.prisma.artist.update({
      where: { id: input.artistId },
      data: {
        backgroundPosition: input.backgroundPosition,
      },
    });

    // Invalidate Redis cache
    const redisCacheKey = `artist:${input.artistId}`;
    await this.redis.del(redisCacheKey);
    this.logger.debug(`Invalidated Redis cache for key: ${redisCacheKey}`);

    // Emit WebSocket event to notify clients
    this.metadataGateway.emitArtistImagesUpdated({
      artistId: input.artistId,
      artistName: artist.name,
      imageType: 'background',
      updatedAt: new Date(),
    });

    this.logger.log(
      `✅ Successfully updated background position for ${artist.name}`,
    );

    return {
      success: true,
      message: 'Background position successfully updated',
    };
  }
}
