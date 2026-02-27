import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { SIMILAR_ARTISTS_PROVIDER, ISimilarArtistsProvider } from '../../ports/similar-artists.port';
import { PLAY_TRACKING_REPOSITORY, IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { GetRelatedArtistsInput, GetRelatedArtistsOutput, RelatedArtistData } from './get-related-artists.dto';

/**
 * GetRelatedArtistsUseCase - Get related artists using Last.fm or internal patterns
 *
 * Optimized with bulk queries to avoid N+1 problems:
 * - Uses findByNames() for bulk artist lookup from Last.fm results
 * - Uses findByIds() for bulk lookup from internal patterns
 */
@Injectable()
export class GetRelatedArtistsUseCase {
  constructor(
    @InjectPinoLogger(GetRelatedArtistsUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepository: IPlayTrackingRepository,
    @Inject(SIMILAR_ARTISTS_PROVIDER)
    private readonly similarArtistsProvider: ISimilarArtistsProvider,
  ) {}

  async execute(input: GetRelatedArtistsInput): Promise<GetRelatedArtistsOutput> {
    const limit = Math.min(Math.max(input.limit || 10, 1), 20);

    // 1. Get the artist from our database
    const artist = await this.artistRepository.findById(input.artistId);
    if (!artist) {
      return {
        data: [],
        artistId: input.artistId,
        limit,
        source: 'none',
      };
    }

    // 2. Try external provider if enabled
    if (this.similarArtistsProvider.isEnabled()) {
      const externalResult = await this.getFromExternalProvider(artist, input.artistId, limit);
      if (externalResult) {
        return externalResult;
      }
    }

    // 3. Fallback to internal co-listening patterns
    return this.getFromInternalPatterns(input.artistId, limit);
  }

  /**
   * Get related artists from external provider, filtered by local library
   * Uses BULK query to avoid N+1 problem
   */
  private async getFromExternalProvider(
    artist: { mbzArtistId?: string | null; name: string },
    artistId: string,
    limit: number,
  ): Promise<GetRelatedArtistsOutput | null> {
    const similarArtists = await this.similarArtistsProvider.getSimilarArtists(
      artist.mbzArtistId || null,
      artist.name,
      50, // Get more so we can filter to local library
    );

    this.logger.info(
      `[Autoplay] External provider returned ${similarArtists?.length || 0} similar artists for: ${artist.name}`
    );

    if (!similarArtists || similarArtists.length === 0) {
      this.logger.info(`[Autoplay] No similar artists found for: ${artist.name}, trying internal patterns`);
      return null;
    }

    // OPTIMIZATION: Bulk lookup all artist names in a single query
    const artistNames = similarArtists.map(s => s.name);
    const artistMap = await this.artistRepository.findByNames(artistNames);

    const relatedArtists: RelatedArtistData[] = [];
    const notFoundInLibrary: string[] = [];

    for (const similar of similarArtists) {
      if (relatedArtists.length >= limit) break;

      // O(1) lookup from map instead of N+1 queries
      const localArtist = artistMap.get(similar.name.toLowerCase());

      if (localArtist && localArtist.id !== artistId) {
        relatedArtists.push({
          id: localArtist.id,
          name: localArtist.name,
          albumCount: localArtist.albumCount,
          songCount: localArtist.songCount,
          matchScore: Math.round(similar.match * 100),
        });
      } else if (!localArtist) {
        notFoundInLibrary.push(similar.name);
      }
    }

    if (notFoundInLibrary.length > 0) {
      this.logger.info(
        `[Autoplay] Similar artists NOT in library: ${notFoundInLibrary.slice(0, 10).join(', ')}${notFoundInLibrary.length > 10 ? '...' : ''}`
      );
    }

    if (relatedArtists.length > 0) {
      this.logger.info(
        `[Autoplay] Found ${relatedArtists.length} related artists IN library: ${relatedArtists.map(a => a.name).join(', ')}`
      );
      return {
        data: relatedArtists,
        artistId,
        limit,
        source: 'external',
      };
    }

    return null;
  }

  /**
   * Get related artists from internal co-listening patterns
   * Uses BULK query to avoid N+1 problem
   */
  private async getFromInternalPatterns(
    artistId: string,
    limit: number,
  ): Promise<GetRelatedArtistsOutput> {
    const internalRelated = await this.playTrackingRepository.getRelatedArtists(
      artistId,
      limit,
    );

    if (internalRelated.length === 0) {
      return {
        data: [],
        artistId,
        limit,
        source: 'none',
      };
    }

    // OPTIMIZATION: Bulk lookup all artist IDs in a single query
    const artistIds = internalRelated.map(r => r.artistId);
    const artists = await this.artistRepository.findByIds(artistIds);

    // Create map for O(1) lookup
    const artistMap = new Map(artists.map(a => [a.id, a]));

    // Normalize scores to 0-100 range relative to the highest score
    const maxScore = internalRelated.length > 0
      ? Math.max(...internalRelated.map(r => r.score))
      : 1;

    const relatedArtists: RelatedArtistData[] = [];
    for (const stat of internalRelated) {
      const artist = artistMap.get(stat.artistId);
      if (artist) {
        relatedArtists.push({
          id: artist.id,
          name: artist.name,
          albumCount: artist.albumCount,
          songCount: artist.songCount,
          matchScore: maxScore > 0 ? Math.round((stat.score / maxScore) * 100) : 0,
        });
      }
    }

    this.logger.debug(
      `Found ${relatedArtists.length} related artists from internal patterns`
    );

    return {
      data: relatedArtists,
      artistId,
      limit,
      source: relatedArtists.length > 0 ? 'internal' : 'none',
    };
  }
}
