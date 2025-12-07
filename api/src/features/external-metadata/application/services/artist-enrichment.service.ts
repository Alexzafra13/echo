import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists } from '@infrastructure/database/schema';
import { IArtistBioRetriever, IArtistImageRetriever, MusicBrainzArtistMatch } from '../../domain/interfaces';
import { AgentRegistryService } from '../../infrastructure/services/agent-registry.service';
import { MetadataConflictService, ConflictPriority } from '../../infrastructure/services/metadata-conflict.service';
import { NotFoundError } from '@shared/errors';
import { MbidSearchService } from './mbid-search.service';
import { GenreEnrichmentService } from './genre-enrichment.service';
import { EnrichmentLogService } from './enrichment-log.service';
import { ArtistBioEnrichmentService } from './artist/artist-bio-enrichment.service';
import { ArtistImageEnrichmentService } from './artist/artist-image-enrichment.service';

export interface ArtistEnrichmentResult {
  bioUpdated: boolean;
  imagesUpdated: boolean;
  errors: string[];
}

/**
 * Service for enriching artist metadata
 * Orchestrates biography, images, MBID search, and genre enrichment
 */
@Injectable()
export class ArtistEnrichmentService {
  private readonly logger = new Logger(ArtistEnrichmentService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly conflictService: MetadataConflictService,
    private readonly mbidSearch: MbidSearchService,
    private readonly genreEnrichment: GenreEnrichmentService,
    private readonly enrichmentLog: EnrichmentLogService,
    private readonly bioEnrichment: ArtistBioEnrichmentService,
    private readonly imageEnrichment: ArtistImageEnrichmentService,
  ) {}

  /**
   * Enrich an artist with external metadata
   */
  async enrich(artistId: string, forceRefresh = false): Promise<ArtistEnrichmentResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let bioUpdated = false;
    let imagesUpdated = false;

    // Check if any enrichment agents are available
    if (!this.hasEnrichmentAgents()) {
      this.logger.warn(
        `No enrichment agents available for artist ${artistId}. ` +
        `Configure API keys (Last.fm, Fanart.tv) to enable metadata enrichment.`
      );
      return { bioUpdated: false, imagesUpdated: false, errors: ['No enrichment agents configured'] };
    }

    try {
      // Get artist from database
      const artist = await this.getArtist(artistId);
      if (!artist) {
        throw new NotFoundError('Artist', artistId);
      }

      this.logger.log(`Enriching artist: ${artist.name} (ID: ${artistId})`);

      // Step 1: Handle MBID search if missing
      const mbzArtistId = await this.ensureMbid(artistId, artist, errors);

      // Step 2: Enrich genres
      await this.enrichGenres(artistId, mbzArtistId, artist.name, errors);

      // Step 3: Enrich biography
      const bioResult = await this.bioEnrichment.enrichBiography(
        artistId,
        { ...artist, mbzArtistId },
        forceRefresh,
        startTime
      );
      bioUpdated = bioResult.updated;

      // Step 4: Enrich images
      const imageResult = await this.imageEnrichment.enrichImages(
        artistId,
        { ...artist, mbzArtistId },
        forceRefresh,
        startTime
      );
      imagesUpdated = imageResult.updated;

      // Log partial success if errors occurred
      if (errors.length > 0 && (bioUpdated || imagesUpdated)) {
        await this.enrichmentLog.logPartial(
          artistId,
          'artist',
          artist.name,
          'multiple',
          'mixed',
          errors.join('; '),
          Date.now() - startTime
        );
      }

      // Ensure artist is marked as processed
      await this.markAsProcessed(artistId, artist.name);

      return { bioUpdated, imagesUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching artist ${artistId}: ${(error as Error).message}`, (error as Error).stack);
      errors.push((error as Error).message);

      await this.logEnrichmentError(artistId, error as Error, startTime);

      return { bioUpdated, imagesUpdated, errors };
    }
  }

  /**
   * Check if enrichment agents are available
   */
  private hasEnrichmentAgents(): boolean {
    const bioAgents = this.agentRegistry.getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever');
    const imageAgents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>('IArtistImageRetriever');
    return bioAgents.length > 0 || imageAgents.length > 0;
  }

  /**
   * Get artist from database
   */
  private async getArtist(artistId: string): Promise<any | null> {
    const result = await this.drizzle.db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);
    return result[0] || null;
  }

  /**
   * Ensure artist has MBID, search if missing
   */
  private async ensureMbid(
    artistId: string,
    artist: any,
    errors: string[]
  ): Promise<string | null> {
    if (artist.mbzArtistId) {
      return artist.mbzArtistId;
    }

    await this.handleMbidSearch(artistId, artist.name, errors);

    // Refresh artist data after potential MBID update
    const refreshed = await this.drizzle.db
      .select({ mbzArtistId: artists.mbzArtistId })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    return refreshed[0]?.mbzArtistId || null;
  }

  /**
   * Handle MBID search and auto-apply or create conflict
   */
  private async handleMbidSearch(artistId: string, artistName: string, errors: string[]): Promise<void> {
    this.logger.log(`Artist "${artistName}" missing MBID, searching MusicBrainz...`);
    try {
      const mbMatches = await this.mbidSearch.searchArtist(artistName);

      if (mbMatches.length > 0) {
        const topMatch = mbMatches[0];

        if (topMatch.score >= 90) {
          await this.autoApplyMbid(artistId, artistName, topMatch);
        } else if (topMatch.score >= 70) {
          await this.createMbidConflict(artistId, artistName, mbMatches);
          await this.markMbidSearched(artistId);
        } else {
          this.logger.log(
            `Low confidence matches for "${artistName}" (best: ${topMatch.score}), skipping MBID assignment`
          );
          await this.markMbidSearched(artistId);
        }
      } else {
        this.logger.log(`No MusicBrainz matches found for "${artistName}"`);
        await this.markMbidSearched(artistId);
      }
    } catch (error) {
      this.logger.warn(`Error searching MBID for "${artistName}": ${(error as Error).message}`);
      errors.push(`MBID search failed: ${(error as Error).message}`);
      await this.markMbidSearched(artistId);
    }
  }

  /**
   * Auto-apply high confidence MBID match
   */
  private async autoApplyMbid(
    artistId: string,
    artistName: string,
    match: MusicBrainzArtistMatch
  ): Promise<void> {
    await this.drizzle.db
      .update(artists)
      .set({
        mbzArtistId: match.mbid,
        mbidSearchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));
    this.logger.log(
      `Auto-applied MBID for "${artistName}": ${match.mbid} (score: ${match.score})`
    );
  }

  /**
   * Create conflict for MBID selection
   */
  private async createMbidConflict(
    artistId: string,
    artistName: string,
    matches: MusicBrainzArtistMatch[]
  ): Promise<void> {
    const topMatch = matches[0];
    const suggestions = matches.slice(0, 3).map((m) =>
      `${m.name}${m.disambiguation ? ` (${m.disambiguation})` : ''} - MBID: ${m.mbid} (score: ${m.score})`
    ).join('\n');

    await this.conflictService.createConflict({
      entityId: artistId,
      entityType: 'artist',
      field: 'artistName',
      currentValue: artistName,
      suggestedValue: `${topMatch.name}${topMatch.disambiguation ? ` (${topMatch.disambiguation})` : ''}`,
      source: 'musicbrainz' as any,
      priority: ConflictPriority.MEDIUM,
      metadata: {
        artistName,
        suggestedMbid: topMatch.mbid,
        score: topMatch.score,
        allSuggestions: suggestions,
      },
    });
    this.logger.log(
      `Created MBID conflict for "${artistName}": score ${topMatch.score}, needs manual review`
    );
  }

  /**
   * Enrich artist genres
   */
  private async enrichGenres(
    artistId: string,
    mbzArtistId: string | null,
    artistName: string,
    errors: string[]
  ): Promise<void> {
    try {
      const genresAdded = await this.genreEnrichment.enrichArtistGenres(
        artistId,
        mbzArtistId || '',
        artistName
      );
      if (genresAdded > 0) {
        this.logger.log(`Added ${genresAdded} genres for artist: ${artistName}`);
      }
    } catch (error) {
      this.logger.warn(`Error enriching genres for "${artistName}": ${(error as Error).message}`);
      errors.push(`Genre enrichment failed: ${(error as Error).message}`);
    }
  }

  /**
   * Mark MBID as searched
   */
  private async markMbidSearched(artistId: string): Promise<void> {
    await this.drizzle.db
      .update(artists)
      .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
      .where(eq(artists.id, artistId));
  }

  /**
   * Mark artist as processed
   */
  private async markAsProcessed(artistId: string, artistName: string): Promise<void> {
    const artistAfter = await this.drizzle.db
      .select({ mbidSearchedAt: artists.mbidSearchedAt })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artistAfter[0]?.mbidSearchedAt) {
      await this.drizzle.db
        .update(artists)
        .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
        .where(eq(artists.id, artistId));
      this.logger.debug(`Marked artist "${artistName}" as processed (mbidSearchedAt)`);
    }
  }

  /**
   * Log enrichment error
   */
  private async logEnrichmentError(artistId: string, error: Error, startTime: number): Promise<void> {
    try {
      const artistResult = await this.drizzle.db
        .select({ name: artists.name })
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      await this.enrichmentLog.logError(
        artistId,
        'artist',
        artistResult[0]?.name || 'Unknown',
        'multiple',
        'mixed',
        error.message,
        Date.now() - startTime
      );
    } catch {
      // Ignore logging errors
    }
  }
}
