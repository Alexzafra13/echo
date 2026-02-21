import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists } from '@infrastructure/database/schema';
import { IArtistBioRetriever } from '../../../domain/interfaces';
import { ArtistBio } from '../../../domain/entities';
import { AgentRegistryService } from '../../../infrastructure/services/agent-registry.service';
import { MetadataCacheService } from '../../../infrastructure/services/metadata-cache.service';
import {
  MetadataConflictService,
  ConflictPriority,
  ConflictSource,
} from '../../../infrastructure/services/metadata-conflict.service';
import { EnrichmentLogService } from '../enrichment-log.service';

export interface BioEnrichmentResult {
  updated: boolean;
  source?: string;
}

/**
 * Service for enriching artist biography
 * Handles bio retrieval from agents, caching, and conflict creation
 */
@Injectable()
export class ArtistBioEnrichmentService {
  constructor(
    @InjectPinoLogger(ArtistBioEnrichmentService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly conflictService: MetadataConflictService,
    private readonly enrichmentLog: EnrichmentLogService
  ) {}

  /**
   * Enrich artist biography
   */
  async enrichBiography(
    artistId: string,
    artist: {
      name: string;
      mbzArtistId: string | null;
      biography?: string | null;
      biographySource?: string | null;
    },
    forceRefresh: boolean,
    startTime: number
  ): Promise<BioEnrichmentResult> {
    const bio = await this.getArtistBio(artist.mbzArtistId, artist.name, forceRefresh, artistId);
    if (!bio) return { updated: false };

    const hasExistingBio = !!artist.biography;
    const isMusicBrainzSource = bio.source === 'musicbrainz';

    if (!hasExistingBio || forceRefresh) {
      await this.drizzle.db
        .update(artists)
        .set({
          biography: bio.content,
          biographySource: bio.source,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      await this.enrichmentLog.logSuccess(
        artistId,
        'artist',
        artist.name,
        bio.source,
        'biography',
        ['biography', 'biographySource'],
        Date.now() - startTime
      );

      this.logger.info(`Updated biography for: ${artist.name} (source: ${bio.source})`);
      return { updated: true, source: bio.source };
    }

    // Create conflict if content is different
    await this.createBioConflictIfNeeded(artistId, artist, bio, isMusicBrainzSource);
    return { updated: false };
  }

  /**
   * Get artist biography using agent chain
   */
  async getArtistBio(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean,
    artistId?: string
  ): Promise<ArtistBio | null> {
    // Check cache first
    if (!forceRefresh && artistId) {
      const cached = await this.cache.get('artist', artistId, 'bio');
      if (cached) {
        return new ArtistBio(cached.content, cached.summary, cached.url, cached.source);
      }
    }

    const agents = this.agentRegistry.getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever');

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for bio: ${name}`);
        const bio = await agent.getArtistBio(mbzArtistId, name);

        if (bio && bio.hasContent()) {
          if (artistId) {
            await this.cache.set('artist', artistId, 'bio', {
              content: bio.content,
              summary: bio.summary,
              url: bio.url,
              source: bio.source,
            });
          }
          return bio;
        }
      } catch (error) {
        this.logger.warn(
          `Agent "${agent.name}" failed for bio ${name}: ${(error as Error).message}`
        );
      }
    }

    this.logger.debug(`No biography found for: ${name}`);
    return null;
  }

  /**
   * Create conflict for biography if content differs
   */
  private async createBioConflictIfNeeded(
    artistId: string,
    artist: { name: string; biography?: string | null; biographySource?: string | null },
    bio: ArtistBio,
    isMusicBrainzSource: boolean
  ): Promise<void> {
    const currentBio = artist.biography || '';
    const suggestedBio = bio.content || '';

    if (currentBio.trim() !== suggestedBio.trim()) {
      await this.conflictService.createConflict({
        entityId: artistId,
        entityType: 'artist',
        field: 'biography',
        currentValue: currentBio.substring(0, 200) + '...',
        suggestedValue: suggestedBio.substring(0, 200) + '...',
        source: bio.source as ConflictSource,
        priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
        metadata: {
          artistName: artist.name,
          currentSource: artist.biographySource,
          fullBioLength: bio.content.length,
        },
      });
      this.logger.info(
        `Created conflict for artist "${artist.name}": existing bio vs ${bio.source} suggestion`
      );
    }
  }
}
