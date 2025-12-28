import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists } from '@infrastructure/database/schema';
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
  constructor(
    @InjectPinoLogger(UpdateArtistBackgroundPositionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(
    input: UpdateArtistBackgroundPositionInput,
  ): Promise<UpdateArtistBackgroundPositionOutput> {
    // Get artist from database
    const artistResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
      })
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    this.logger.info(
      `Updating background position for artist: ${artist.name} to "${input.backgroundPosition}"`,
    );

    // Update the background position
    await this.drizzle.db
      .update(artists)
      .set({
        backgroundPosition: input.backgroundPosition,
      })
      .where(eq(artists.id, input.artistId));

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

    this.logger.info(
      `✅ Successfully updated background position for ${artist.name}`,
    );

    return {
      success: true,
      message: 'Background position successfully updated',
    };
  }
}
