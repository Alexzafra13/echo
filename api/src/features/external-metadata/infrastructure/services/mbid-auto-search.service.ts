import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(MbidAutoSearchService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly searchExecutor: MbidSearchExecutorService,
    private readonly confidenceStrategy: MbidConfidenceStrategyService
  ) {}

  /**
   * Search MBID for an artist
   */
  async searchArtistMbid(
    artistId: string,
    artistName: string,
    createConflictIfNeeded = true
  ): Promise<MbidSearchResult> {
    try {
      if (!(await this.confidenceStrategy.isEnabled())) {
        return this.confidenceStrategy.buildDisabledResult();
      }

      const matches = await this.searchExecutor.searchArtist(artistName);
      const result = await this.confidenceStrategy.determineAction(matches, artistName);

      if (result.action === 'auto-apply' && result.topMatch) {
        this.logger.info(
          `High confidence match (${result.topMatch.score}) for artist "${artistName}" → "${result.topMatch.name}" (${result.topMatch.mbid})`
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
          result
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error searching MBID for artist "${artistName}": ${(error as Error).message}`
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
    createConflictIfNeeded = true
  ): Promise<MbidSearchResult> {
    try {
      if (!(await this.confidenceStrategy.isEnabled())) {
        return this.confidenceStrategy.buildDisabledResult();
      }

      const matches = await this.searchExecutor.searchAlbum(albumName, artistName);
      const result = await this.confidenceStrategy.determineAction(matches, albumName);

      if (result.action === 'auto-apply' && result.topMatch) {
        this.logger.info(
          `High confidence match (${result.topMatch.score}) for album "${albumName}" → "${result.topMatch.name}" (${result.topMatch.mbid})`
        );

        await this.drizzle.db
          .update(albums)
          .set({
            mbzAlbumId: result.topMatch.mbid,
            mbzAlbumArtistId: (result.topMatch.details.artistMbid as string | undefined) ?? null,
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
          result
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error searching MBID for album "${albumName}": ${(error as Error).message}`
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
    createConflictIfNeeded = true
  ): Promise<MbidSearchResult> {
    try {
      if (!(await this.confidenceStrategy.isEnabled())) {
        return this.confidenceStrategy.buildDisabledResult();
      }

      const matches = await this.searchExecutor.searchTrack(params);
      const result = await this.confidenceStrategy.determineAction(matches, params.title);

      if (result.action === 'auto-apply' && result.topMatch) {
        this.logger.info(
          `High confidence match (${result.topMatch.score}) for track "${params.title}" → "${result.topMatch.name}" (${result.topMatch.mbid})`
        );

        await this.drizzle.db
          .update(tracks)
          .set({
            mbzTrackId: result.topMatch.mbid,
            mbzArtistId: (result.topMatch.details.artistMbid as string | undefined) ?? null,
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
          result
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error searching MBID for track "${params.title}": ${(error as Error).message}`
      );
      return this.confidenceStrategy.buildErrorResult(error as Error);
    }
  }

  /**
   * Get auto-search statistics for admin panel
   * Calcula estadísticas basadas en datos reales de la base de datos
   */
  async getAutoSearchStats(): Promise<{
    totalAutoSearched: number;
    autoApplied: number;
    conflictsCreated: number;
    ignored: number;
  }> {
    // Conflictos pendientes de auto-search
    const [pendingConflicts] = await this.drizzle.db
      .select({ count: count() })
      .from(metadataConflicts)
      .where(
        and(
          sql`${metadataConflicts.metadata}->>'autoSearched' = 'true'`,
          eq(metadataConflicts.status, 'pending')
        )
      );

    // Conflictos aceptados (auto-applied por usuario o auto)
    const [acceptedConflicts] = await this.drizzle.db
      .select({ count: count() })
      .from(metadataConflicts)
      .where(
        and(
          sql`${metadataConflicts.metadata}->>'autoSearched' = 'true'`,
          eq(metadataConflicts.status, 'accepted')
        )
      );

    // Conflictos ignorados/rechazados
    const [ignoredConflicts] = await this.drizzle.db
      .select({ count: count() })
      .from(metadataConflicts)
      .where(
        and(
          sql`${metadataConflicts.metadata}->>'autoSearched' = 'true'`,
          sql`${metadataConflicts.status} IN ('rejected', 'ignored')`
        )
      );

    // Artistas con MBID asignado (auto-applied silenciosamente)
    const [artistsWithMbid] = await this.drizzle.db
      .select({ count: count() })
      .from(artists)
      .where(sql`${artists.mbzArtistId} IS NOT NULL`);

    // Albums con MBID asignado
    const [albumsWithMbid] = await this.drizzle.db
      .select({ count: count() })
      .from(albums)
      .where(sql`${albums.mbzAlbumId} IS NOT NULL`);

    const conflictsCreated = pendingConflicts?.count ?? 0;
    const autoApplied =
      (artistsWithMbid?.count ?? 0) +
      (albumsWithMbid?.count ?? 0) +
      (acceptedConflicts?.count ?? 0);
    const ignored = ignoredConflicts?.count ?? 0;
    const totalAutoSearched = autoApplied + conflictsCreated + ignored;

    return {
      totalAutoSearched,
      autoApplied,
      conflictsCreated,
      ignored,
    };
  }
}
