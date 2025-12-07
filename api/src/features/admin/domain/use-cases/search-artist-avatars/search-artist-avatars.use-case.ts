import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists } from '@infrastructure/database/schema';
import { ImageSearchOrchestratorService } from '@features/external-metadata/application/services';
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
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly imageSearchOrchestrator: ImageSearchOrchestratorService,
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

    // Search images using orchestrator
    const images = await this.imageSearchOrchestrator.searchArtistImages({
      artistName: artist.name,
      mbzArtistId: artist.mbzArtistId || null,
    });

    // Map to output format
    const avatars: AvatarOption[] = images.map((img) => ({
      provider: img.provider,
      url: img.url,
      thumbnailUrl: img.thumbnailUrl,
      width: img.width,
      height: img.height,
      type: img.type,
    }));

    return {
      avatars,
      artistInfo: {
        id: artist.id,
        name: artist.name,
        mbzArtistId: artist.mbzArtistId || undefined,
      },
    };
  }
}
