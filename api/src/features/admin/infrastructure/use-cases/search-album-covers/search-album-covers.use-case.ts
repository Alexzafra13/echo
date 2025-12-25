import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { albums, artists } from '@infrastructure/database/schema';
import { ImageSearchOrchestratorService } from '@features/external-metadata/application/services';
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
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly imageSearchOrchestrator: ImageSearchOrchestratorService,
  ) {}

  async execute(input: SearchAlbumCoversInput): Promise<SearchAlbumCoversOutput> {
    // Get album from database with artist info
    const albumResult = await this.drizzle.db
      .select({
        album: albums,
        artist: artists,
      })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const result = albumResult[0];

    if (!result) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    const album = result.album;
    const artistName = result.artist?.name || 'Unknown Artist';

    // Search covers using orchestrator
    const images = await this.imageSearchOrchestrator.searchAlbumCovers({
      albumName: album.name,
      artistName,
      mbzAlbumId: album.mbzAlbumId || null,
      mbzArtistId: result.artist?.mbzArtistId || null,
    });

    // Map to output format
    const covers: CoverOption[] = images.map((img) => ({
      provider: img.provider,
      url: img.url,
      thumbnailUrl: img.thumbnailUrl,
      width: img.width,
      height: img.height,
      size: img.size,
    }));

    return {
      covers,
      albumInfo: {
        id: album.id,
        name: album.name,
        artistName,
        mbzAlbumId: album.mbzAlbumId || undefined,
      },
    };
  }
}
