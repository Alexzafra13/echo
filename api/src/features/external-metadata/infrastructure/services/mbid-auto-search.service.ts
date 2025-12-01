import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and, count, sql } from 'drizzle-orm';
import { artists, albums, tracks, metadataConflicts } from '@infrastructure/database/schema';
import { MusicBrainzAgent } from '../agents/musicbrainz.agent';
import { MetadataConflictService, ConflictPriority } from './metadata-conflict.service';
import { SettingsService } from './settings.service';
import { MbidSearchCacheService } from './mbid-search-cache.service';

/**
 * MBID Auto-Search Result
 * Resultado de la búsqueda automática de MBID con múltiples sugerencias
 */
export interface MbidSearchResult {
  topMatch: {
    mbid: string;
    name: string;
    score: number;
    details: Record<string, any>;
  } | null;
  suggestions: Array<{
    mbid: string;
    name: string;
    score: number;
    details: Record<string, any>;
  }>;
  action: 'auto-apply' | 'create-conflict' | 'ignore';
  reason?: string;
}

/**
 * MbidAutoSearchService
 *
 * Servicio para búsqueda automática de MBIDs al estilo MusicBrainz Picard
 *
 * Features:
 * - Búsqueda automática cuando MBID falta en tags
 * - Múltiples sugerencias con scores (top 5)
 * - Auto-aplicación para coincidencias de alta confianza (≥95)
 * - Conflictos con sugerencias múltiples para confianza media (75-94)
 * - Ignorar coincidencias de baja confianza (<75)
 *
 * Flujo:
 * 1. Scanner detecta entidad sin MBID
 * 2. Busca en MusicBrainz usando metadata existente
 * 3. Score ≥95: Auto-aplica MBID silenciosamente
 * 4. Score 75-94: Crea conflicto con top 5 sugerencias para revisión manual
 * 5. Score <75: Ignora (puede crear conflicto de baja prioridad si está configurado)
 */
@Injectable()
export class MbidAutoSearchService {
  private readonly logger = new Logger(MbidAutoSearchService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly musicBrainzAgent: MusicBrainzAgent,
    private readonly conflictService: MetadataConflictService,
    private readonly settingsService: SettingsService,
    private readonly searchCache: MbidSearchCacheService,
  ) {}

  /**
   * Busca MBID para un artista que no lo tiene
   *
   * @param artistId - ID del artista en la base de datos
   * @param artistName - Nombre del artista para búsqueda
   * @param createConflictIfNeeded - Si crear conflicto para coincidencias medias (default: true)
   * @returns Resultado de la búsqueda con acción recomendada
   */
  async searchArtistMbid(
    artistId: string,
    artistName: string,
    createConflictIfNeeded = true,
  ): Promise<MbidSearchResult> {
    try {
      // Verificar si la búsqueda automática está habilitada
      const enabled = await this.settingsService.getBoolean(
        'metadata.auto_search_mbid.enabled',
        false,
      );

      if (!enabled) {
        return {
          topMatch: null,
          suggestions: [],
          action: 'ignore',
          reason: 'Auto-search MBID disabled in settings',
        };
      }

      this.logger.debug(`Searching MBID for artist: ${artistName}`);

      // Intentar obtener del caché primero
      const cachedMatches = await this.searchCache.get(artistName, 'artist');
      let matches;

      if (cachedMatches) {
        this.logger.debug(`Using cached results for artist: ${artistName}`);
        matches = cachedMatches;
      } else {
        // Buscar en MusicBrainz (top 10 para tener buenas opciones)
        matches = await this.musicBrainzAgent.searchArtist(artistName, 10);

        // Guardar en caché (TTL: 7 días)
        if (matches && matches.length > 0) {
          await this.searchCache.set({
            queryText: artistName,
            queryType: 'artist',
            results: matches,
            resultCount: matches.length,
          });
        }
      }

      if (!matches || matches.length === 0) {
        this.logger.debug(`No MBID matches found for artist: ${artistName}`);
        return {
          topMatch: null,
          suggestions: [],
          action: 'ignore',
          reason: 'No matches found in MusicBrainz',
        };
      }

      // Preparar sugerencias (top 5)
      const suggestions = matches.slice(0, 5).map((match) => ({
        mbid: match.mbid,
        name: match.name,
        score: match.score,
        details: {
          sortName: match.sortName,
          disambiguation: match.disambiguation,
          type: match.type,
          country: match.country,
          lifeSpan: match.lifeSpan,
        },
      }));

      const topMatch = suggestions[0];

      // Obtener umbral de confianza de configuración
      const confidenceThreshold = await this.settingsService.getNumber(
        'metadata.auto_search_mbid.confidence_threshold',
        95,
      );

      // Determinar acción basada en score
      if (topMatch.score >= confidenceThreshold) {
        // Alta confianza: Auto-aplicar
        this.logger.log(
          `High confidence match (${topMatch.score}) for artist "${artistName}" → "${topMatch.name}" (${topMatch.mbid})`,
        );

        // Aplicar MBID automáticamente
        await this.drizzle.db
          .update(artists)
          .set({ mbzArtistId: topMatch.mbid })
          .where(eq(artists.id, artistId));

        return {
          topMatch,
          suggestions,
          action: 'auto-apply',
          reason: `High confidence match (score: ${topMatch.score})`,
        };
      } else if (topMatch.score >= 75) {
        // Confianza media: Crear conflicto con sugerencias
        if (createConflictIfNeeded) {
          this.logger.log(
            `Medium confidence match (${topMatch.score}) for artist "${artistName}" → Creating conflict with ${suggestions.length} suggestions`,
          );

          await this.conflictService.createConflict({
            entityId: artistId,
            entityType: 'artist',
            field: 'artistName',
            currentValue: artistName,
            suggestedValue: topMatch.name,
            source: 'musicbrainz',
            priority: ConflictPriority.MEDIUM,
            metadata: {
              conflictType: 'mbid-suggestion',
              artistName,
              suggestions, // Guardar todas las sugerencias
              searchQuery: artistName,
              autoSearched: true,
            },
          });

          return {
            topMatch,
            suggestions,
            action: 'create-conflict',
            reason: `Medium confidence match (score: ${topMatch.score}) - user review needed`,
          };
        }
      }

      // Baja confianza: Ignorar
      this.logger.debug(
        `Low confidence match (${topMatch.score}) for artist "${artistName}" - ignoring`,
      );

      return {
        topMatch,
        suggestions,
        action: 'ignore',
        reason: `Low confidence match (score: ${topMatch.score})`,
      };
    } catch (error) {
      this.logger.error(
        `Error searching MBID for artist "${artistName}": ${(error as Error).message}`,
      );
      return {
        topMatch: null,
        suggestions: [],
        action: 'ignore',
        reason: `Error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Busca MBID para un álbum que no lo tiene
   *
   * @param albumId - ID del álbum en la base de datos
   * @param albumName - Nombre del álbum
   * @param artistName - Nombre del artista (para mejor coincidencia)
   * @param createConflictIfNeeded - Si crear conflicto para coincidencias medias (default: true)
   * @returns Resultado de la búsqueda con acción recomendada
   */
  async searchAlbumMbid(
    albumId: string,
    albumName: string,
    artistName: string,
    createConflictIfNeeded = true,
  ): Promise<MbidSearchResult> {
    try {
      const enabled = await this.settingsService.getBoolean(
        'metadata.auto_search_mbid.enabled',
        false,
      );

      if (!enabled) {
        return {
          topMatch: null,
          suggestions: [],
          action: 'ignore',
          reason: 'Auto-search MBID disabled in settings',
        };
      }

      this.logger.debug(`Searching MBID for album: "${albumName}" by ${artistName}`);

      // Intentar obtener del caché primero
      const cacheKey = `${albumName}|${artistName}`;
      const cachedMatches = await this.searchCache.get(cacheKey, 'album', { artist: artistName });
      let matches;

      if (cachedMatches) {
        this.logger.debug(`Using cached results for album: "${albumName}"`);
        matches = cachedMatches;
      } else {
        // Buscar en MusicBrainz (top 10)
        matches = await this.musicBrainzAgent.searchAlbum(albumName, artistName, 10);

        // Guardar en caché (TTL: 7 días)
        if (matches && matches.length > 0) {
          await this.searchCache.set({
            queryText: cacheKey,
            queryType: 'album',
            queryParams: { artist: artistName },
            results: matches,
            resultCount: matches.length,
          });
        }
      }

      if (!matches || matches.length === 0) {
        this.logger.debug(
          `No MBID matches found for album: "${albumName}" by ${artistName}`,
        );
        return {
          topMatch: null,
          suggestions: [],
          action: 'ignore',
          reason: 'No matches found in MusicBrainz',
        };
      }

      // Preparar sugerencias (top 5)
      const suggestions = matches.slice(0, 5).map((match) => ({
        mbid: match.mbid,
        name: match.title,
        score: match.score,
        details: {
          artistName: match.artistName,
          artistMbid: match.artistMbid,
          primaryType: match.primaryType,
          secondaryTypes: match.secondaryTypes,
          firstReleaseDate: match.firstReleaseDate,
          disambiguation: match.disambiguation,
        },
      }));

      const topMatch = suggestions[0];

      // Obtener umbral de confianza
      const confidenceThreshold = await this.settingsService.getNumber(
        'metadata.auto_search_mbid.confidence_threshold',
        95,
      );

      // Determinar acción basada en score
      if (topMatch.score >= confidenceThreshold) {
        // Alta confianza: Auto-aplicar
        this.logger.log(
          `High confidence match (${topMatch.score}) for album "${albumName}" → "${topMatch.name}" (${topMatch.mbid})`,
        );

        // Aplicar MBID y artist MBID automáticamente
        await this.drizzle.db
          .update(albums)
          .set({
            mbzAlbumId: topMatch.mbid,
            mbzAlbumArtistId: topMatch.details.artistMbid || undefined,
          })
          .where(eq(albums.id, albumId));

        return {
          topMatch,
          suggestions,
          action: 'auto-apply',
          reason: `High confidence match (score: ${topMatch.score})`,
        };
      } else if (topMatch.score >= 75) {
        // Confianza media: Crear conflicto con sugerencias
        if (createConflictIfNeeded) {
          this.logger.log(
            `Medium confidence match (${topMatch.score}) for album "${albumName}" → Creating conflict with ${suggestions.length} suggestions`,
          );

          await this.conflictService.createConflict({
            entityId: albumId,
            entityType: 'album',
            field: 'albumName',
            currentValue: albumName,
            suggestedValue: topMatch.name,
            source: 'musicbrainz',
            priority: ConflictPriority.MEDIUM,
            metadata: {
              conflictType: 'mbid-suggestion',
              albumName,
              artistName,
              suggestions, // Guardar todas las sugerencias
              searchQuery: `album: "${albumName}" artist: "${artistName}"`,
              autoSearched: true,
            },
          });

          return {
            topMatch,
            suggestions,
            action: 'create-conflict',
            reason: `Medium confidence match (score: ${topMatch.score}) - user review needed`,
          };
        }
      }

      // Baja confianza: Ignorar
      this.logger.debug(
        `Low confidence match (${topMatch.score}) for album "${albumName}" - ignoring`,
      );

      return {
        topMatch,
        suggestions,
        action: 'ignore',
        reason: `Low confidence match (score: ${topMatch.score})`,
      };
    } catch (error) {
      this.logger.error(
        `Error searching MBID for album "${albumName}": ${(error as Error).message}`,
      );
      return {
        topMatch: null,
        suggestions: [],
        action: 'ignore',
        reason: `Error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Busca MBID para un track (recording) que no lo tiene
   * Usa búsqueda multi-field como Picard (artist + album + track + duration)
   *
   * @param trackId - ID del track en la base de datos
   * @param params - Parámetros de búsqueda (artist, album, title, track#, duration)
   * @param createConflictIfNeeded - Si crear conflicto para coincidencias medias (default: true)
   * @returns Resultado de la búsqueda con acción recomendada
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
      const enabled = await this.settingsService.getBoolean(
        'metadata.auto_search_mbid.enabled',
        false,
      );

      if (!enabled) {
        return {
          topMatch: null,
          suggestions: [],
          action: 'ignore',
          reason: 'Auto-search MBID disabled in settings',
        };
      }

      this.logger.debug(
        `Searching MBID for track: "${params.title}" by ${params.artist}${params.album ? ` from "${params.album}"` : ''}`,
      );

      // Intentar obtener del caché primero
      const cacheKey = `${params.artist}|${params.title}|${params.album || ''}`;
      const searchParams = {
        artist: params.artist,
        album: params.album,
        trackNumber: params.trackNumber,
        duration: params.duration,
      };
      const cachedMatches = await this.searchCache.get(cacheKey, 'recording', searchParams);
      let matches;

      if (cachedMatches) {
        this.logger.debug(`Using cached results for track: "${params.title}"`);
        matches = cachedMatches;
      } else {
        // Buscar en MusicBrainz usando multi-field search (como Picard)
        matches = await this.musicBrainzAgent.searchRecording(
          {
            artist: params.artist,
            release: params.album,
            recording: params.title,
            trackNumber: params.trackNumber,
            duration: params.duration,
          },
          10,
        );

        // Guardar en caché (TTL: 7 días)
        if (matches && matches.length > 0) {
          await this.searchCache.set({
            queryText: cacheKey,
            queryType: 'recording',
            queryParams: searchParams,
            results: matches,
            resultCount: matches.length,
          });
        }
      }

      if (!matches || matches.length === 0) {
        this.logger.debug(
          `No MBID matches found for track: "${params.title}" by ${params.artist}`,
        );
        return {
          topMatch: null,
          suggestions: [],
          action: 'ignore',
          reason: 'No matches found in MusicBrainz',
        };
      }

      // Preparar sugerencias (top 5)
      const suggestions = matches.slice(0, 5).map((match) => ({
        mbid: match.mbid,
        name: match.title,
        score: match.score,
        details: {
          artistName: match.artistName,
          artistMbid: match.artistMbid,
          length: match.length,
          releases: match.releases,
        },
      }));

      const topMatch = suggestions[0];

      // Obtener umbral de confianza
      const confidenceThreshold = await this.settingsService.getNumber(
        'metadata.auto_search_mbid.confidence_threshold',
        95,
      );

      // Determinar acción basada en score
      if (topMatch.score >= confidenceThreshold) {
        // Alta confianza: Auto-aplicar
        this.logger.log(
          `High confidence match (${topMatch.score}) for track "${params.title}" → "${topMatch.name}" (${topMatch.mbid})`,
        );

        // Aplicar MBID automáticamente
        await this.drizzle.db
          .update(tracks)
          .set({
            mbzTrackId: topMatch.mbid,
            mbzArtistId: topMatch.details.artistMbid || undefined,
          })
          .where(eq(tracks.id, trackId));

        return {
          topMatch,
          suggestions,
          action: 'auto-apply',
          reason: `High confidence match (score: ${topMatch.score})`,
        };
      } else if (topMatch.score >= 75) {
        // Confianza media: Crear conflicto con sugerencias
        if (createConflictIfNeeded) {
          this.logger.log(
            `Medium confidence match (${topMatch.score}) for track "${params.title}" → Creating conflict with ${suggestions.length} suggestions`,
          );

          await this.conflictService.createConflict({
            entityId: trackId,
            entityType: 'track',
            field: 'artistName',
            currentValue: params.title,
            suggestedValue: topMatch.name,
            source: 'musicbrainz',
            priority: ConflictPriority.MEDIUM,
            metadata: {
              conflictType: 'mbid-suggestion',
              trackName: params.title,
              artistName: params.artist,
              albumName: params.album,
              suggestions, // Guardar todas las sugerencias
              searchQuery: JSON.stringify(params),
              autoSearched: true,
            },
          });

          return {
            topMatch,
            suggestions,
            action: 'create-conflict',
            reason: `Medium confidence match (score: ${topMatch.score}) - user review needed`,
          };
        }
      }

      // Baja confianza: Ignorar
      this.logger.debug(
        `Low confidence match (${topMatch.score}) for track "${params.title}" - ignoring`,
      );

      return {
        topMatch,
        suggestions,
        action: 'ignore',
        reason: `Low confidence match (score: ${topMatch.score})`,
      };
    } catch (error) {
      this.logger.error(
        `Error searching MBID for track "${params.title}": ${(error as Error).message}`,
      );
      return {
        topMatch: null,
        suggestions: [],
        action: 'ignore',
        reason: `Error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Estadísticas de auto-búsqueda MBID
   * Útil para el panel de admin
   */
  async getAutoSearchStats(): Promise<{
    totalAutoSearched: number;
    autoApplied: number;
    conflictsCreated: number;
    ignored: number;
  }> {
    // Contar conflictos creados por auto-búsqueda
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(metadataConflicts)
      .where(
        and(
          sql`${metadataConflicts.metadata}->>'autoSearched' = 'true'`,
          eq(metadataConflicts.status, 'pending')
        )
      );

    const conflictsCreated = result[0]?.count ?? 0;

    // Para auto-applied e ignored, necesitaríamos un log separado
    // Por ahora, solo retornamos los conflictos
    return {
      totalAutoSearched: 0, // TODO: Implementar tracking
      autoApplied: 0, // TODO: Implementar tracking
      conflictsCreated,
      ignored: 0, // TODO: Implementar tracking
    };
  }
}
