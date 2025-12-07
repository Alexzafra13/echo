import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and, count, sql } from 'drizzle-orm';
import { artists, albums, tracks, metadataConflicts } from '@infrastructure/database/schema';
import {
  MbidSearchExecutorService,
  MbidConfidenceStrategyService,
  MbidSearchResult,
} from './mbid-search';

// Re-export types for backwards compatibility
export type { MbidSearchResult } from './mbid-search';

/**
 * MbidAutoSearchService - Orchestrator for automatic MBID search
 *
 * Picard-style MBID search with confidence-based actions:
 * - Score ≥95: Auto-apply MBID silently
 * - Score 75-94: Create conflict with top 5 suggestions for manual review
 * - Score <75: Ignore (low confidence)
 *
 * Delegates to:
 * - MbidSearchExecutorService: cache + MusicBrainz API searches
 * - MbidConfidenceStrategyService: confidence-based decision logic
 */
@Injectable()
export class MbidAutoSearchService {
  private readonly logger = new Logger(MbidAutoSearchService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly searchExecutor: MbidSearchExecutorService,
    private readonly confidenceStrategy: MbidConfidenceStrategyService,
  ) {}

  /**
   * Search MBID for an artist
   */
  async searchArtistMbid(
    artistId: string,
    artistName: string,
    createConflictIfNeeded = true,
  ): Promise<MbidSearchResult> {
    try {
      if (!(await this.confidenceStrategy.isEnabled())) {
        return this.confidenceStrategy.buildDisabledResult();
      }

      const matches = await this.searchExecutor.searchArtist(artistName);
      const result = await this.confidenceStrategy.determineAction(matches, artistName);

      if (result.action === 'auto-apply' && result.topMatch) {
        this.logger.log(
          `High confidence match (${result.topMatch.score}) for artist "${artistName}" → "${result.topMatch.name}" (${result.topMatch.mbid})`,
        );

        await this.drizzle.db
          .update(artists)
          .set({ mbzArtistId: result.topMatch.mbid })
          .where(eq(artists.id, artistId));
      } else if (result.action === 'create-conflict' && createConflictIfNeeded) {
        await this.confidenceStrategy.createMbidConflict(
          {
            entityId: artistId,
            entityType: 'artist',
            currentValue: artistName,
            metadata: { artistName, searchQuery: artistName },
          },
          result,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error searching MBID for artist "${artistName}": ${(error as Error).message}`,
      );
      return this.confidenceStrategy.buildErrorResult(error as Error);
    }
  }

  /**
   * Search MBID for an album
   */
  async searchAlbumMbid(
    albumId: string,
    albumName: string,
    artistName: string,
    createConflictIfNeeded = true,
  ): Promise<MbidSearchResult> {
    try {
      if (!(await this.confidenceStrategy.isEnabled())) {
        return this.confidenceStrategy.buildDisabledResult();
      }

      const matches = await this.searchExecutor.searchAlbum(albumName, artistName);
      const result = await this.confidenceStrategy.determineAction(matches, albumName);

      if (result.action === 'auto-apply' && result.topMatch) {
        this.logger.log(
          `High confidence match (${result.topMatch.score}) for album "${albumName}" → "${result.topMatch.name}" (${result.topMatch.mbid})`,
        );

        await this.drizzle.db
          .update(albums)
          .set({
            mbzAlbumId: result.topMatch.mbid,
            mbzAlbumArtistId: result.topMatch.details.artistMbid || undefined,
          })
          .where(eq(albums.id, albumId));
      } else if (result.action === 'create-conflict' && createConflictIfNeeded) {
        await this.confidenceStrategy.createMbidConflict(
          {
            entityId: albumId,
            entityType: 'album',
            currentValue: albumName,
            metadata: {
              albumName,
              artistName,
              searchQuery: `album: "${albumName}" artist: "${artistName}"`,
            },
          },
          result,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error searching MBID for album "${albumName}": ${(error as Error).message}`,
      );
      return this.confidenceStrategy.buildErrorResult(error as Error);
    }
  }

  /**
   * Search MBID for a track (recording)
   */
  async searchTrackMbid(
    trackId: string,
    params: {
      artist: string;
      album?: string;
      title: string;
      trackNumber?: number;
      duration?: number;
    },
    createConflictIfNeeded = true,
  ): Promise<MbidSearchResult> {
    try {
      if (!(await this.confidenceStrategy.isEnabled())) {
        return this.confidenceStrategy.buildDisabledResult();
      }

      const matches = await this.searchExecutor.searchTrack(params);
      const result = await this.confidenceStrategy.determineAction(matches, params.title);

      if (result.action === 'auto-apply' && result.topMatch) {
        this.logger.log(
          `High confidence match (${result.topMatch.score}) for track "${params.title}" → "${result.topMatch.name}" (${result.topMatch.mbid})`,
        );

        await this.drizzle.db
          .update(tracks)
          .set({
            mbzTrackId: result.topMatch.mbid,
            mbzArtistId: result.topMatch.details.artistMbid || undefined,
          })
          .where(eq(tracks.id, trackId));
      } else if (result.action === 'create-conflict' && createConflictIfNeeded) {
        await this.confidenceStrategy.createMbidConflict(
          {
            entityId: trackId,
            entityType: 'track',
            currentValue: params.title,
            metadata: {
              trackName: params.title,
              artistName: params.artist,
              albumName: params.album,
              searchQuery: JSON.stringify(params),
            },
          },
          result,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error searching MBID for track "${params.title}": ${(error as Error).message}`,
      );
      return this.confidenceStrategy.buildErrorResult(error as Error);
    }
  }

  /**
   * Get auto-search statistics for admin panel
   */
  async getAutoSearchStats(): Promise<{
    totalAutoSearched: number;
    autoApplied: number;
    conflictsCreated: number;
    ignored: number;
  }> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(metadataConflicts)
      .where(
        and(
          sql`${metadataConflicts.metadata}->>'autoSearched' = 'true'`,
          eq(metadataConflicts.status, 'pending'),
        ),
      );

    const conflictsCreated = result[0]?.count ?? 0;

    return {
      totalAutoSearched: 0, // TODO: Implement tracking
      autoApplied: 0, // TODO: Implement tracking
      conflictsCreated,
      ignored: 0, // TODO: Implement tracking
    };
  }
}
