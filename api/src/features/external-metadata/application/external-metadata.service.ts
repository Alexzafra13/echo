import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ArtistEnrichmentService, ArtistEnrichmentResult } from './services/artist-enrichment.service';
import { AlbumEnrichmentService, AlbumEnrichmentResult } from './services/album-enrichment.service';

/**
 * External Metadata Service
 * Facade for metadata enrichment from external sources
 *
 * Design Pattern: Facade Pattern
 * Purpose: Provide a unified interface for metadata enrichment
 *
 * This service delegates to specialized services:
 * - ArtistEnrichmentService: Artist biography, images, MBID, genres
 * - AlbumEnrichmentService: Album covers, MBID, genres
 */
@Injectable()
export class ExternalMetadataService {
  constructor(
    @InjectPinoLogger(ExternalMetadataService.name)
    private readonly logger: PinoLogger,
    private readonly artistEnrichment: ArtistEnrichmentService,
    private readonly albumEnrichment: AlbumEnrichmentService,
  ) {}

  /**
   * Enrich an artist with external metadata
   * Fetches biography and images from configured agents and downloads them locally
   *
   * @param artistId Internal artist ID
   * @param forceRefresh Skip cache and force fresh API calls
   * @returns Object with enrichment results
   */
  async enrichArtist(
    artistId: string,
    forceRefresh = false
  ): Promise<ArtistEnrichmentResult> {
    return this.artistEnrichment.enrich(artistId, forceRefresh);
  }

  /**
   * Enrich an album with external metadata
   * Fetches cover art from configured agents and downloads it locally
   *
   * @param albumId Internal album ID
   * @param forceRefresh Skip cache and force fresh API calls
   * @returns Object with enrichment results
   */
  async enrichAlbum(
    albumId: string,
    forceRefresh = false
  ): Promise<AlbumEnrichmentResult> {
    return this.albumEnrichment.enrich(albumId, forceRefresh);
  }
}
