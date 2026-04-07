import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { isNotNull, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, enrichmentLogs } from '@infrastructure/database/schema';

/**
 * BackfillEnrichmentLogsUseCase
 *
 * Generates enrichment_logs entries from existing artist/album data
 * that was enriched before the logging system was implemented.
 * This ensures the Historial tab shows a complete picture of all enrichments.
 */
@Injectable()
export class BackfillEnrichmentLogsUseCase {
  constructor(
    @InjectPinoLogger(BackfillEnrichmentLogsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService
  ) {}

  async execute(): Promise<{ created: number; artists: number; albums: number }> {
    let artistCount = 0;
    let albumCount = 0;

    // 1. Backfill artist biography enrichments
    const artistsWithBio = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        biographySource: artists.biographySource,
        updatedAt: artists.updatedAt,
      })
      .from(artists)
      .where(isNotNull(artists.biography));

    for (const artist of artistsWithBio) {
      const exists = await this.checkLogExists(artist.id, 'biography');
      if (!exists) {
        await this.drizzle.db.insert(enrichmentLogs).values({
          entityId: artist.id,
          entityType: 'artist',
          entityName: artist.name,
          provider: artist.biographySource || 'lastfm',
          metadataType: 'biography',
          status: 'success',
          fieldsUpdated: ['biography', 'biographySource'],
          createdAt: artist.updatedAt,
        });
        artistCount++;
      }
    }

    // 2. Backfill artist image enrichments
    const artistsWithImages = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        externalProfileSource: artists.externalProfileSource,
        externalProfileUpdatedAt: artists.externalProfileUpdatedAt,
        hasProfile: sql<boolean>`${artists.externalProfilePath} IS NOT NULL`.as('has_profile'),
        hasBg: sql<boolean>`${artists.externalBackgroundPath} IS NOT NULL`.as('has_bg'),
        hasBanner: sql<boolean>`${artists.externalBannerPath} IS NOT NULL`.as('has_banner'),
        hasLogo: sql<boolean>`${artists.externalLogoPath} IS NOT NULL`.as('has_logo'),
      })
      .from(artists)
      .where(isNotNull(artists.externalProfilePath));

    for (const artist of artistsWithImages) {
      const exists = await this.checkLogExists(artist.id, 'images');
      if (!exists) {
        const fields: string[] = [];
        if (artist.hasProfile) fields.push('externalProfilePath');
        if (artist.hasBg) fields.push('externalBackgroundPath');
        if (artist.hasBanner) fields.push('externalBannerPath');
        if (artist.hasLogo) fields.push('externalLogoPath');

        await this.drizzle.db.insert(enrichmentLogs).values({
          entityId: artist.id,
          entityType: 'artist',
          entityName: artist.name,
          provider: artist.externalProfileSource || 'fanart',
          metadataType: 'images',
          status: 'success',
          fieldsUpdated: fields,
          previewUrl: `/api/images/artists/${artist.id}/profile`,
          createdAt:
            artist.externalProfileUpdatedAt || artist.externalProfileUpdatedAt || new Date(),
        });
        artistCount++;
      }
    }

    // 3. Backfill album cover enrichments
    const albumsWithCovers = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        externalCoverSource: albums.externalCoverSource,
        externalInfoUpdatedAt: albums.externalInfoUpdatedAt,
        updatedAt: albums.updatedAt,
      })
      .from(albums)
      .where(isNotNull(albums.externalCoverPath));

    for (const album of albumsWithCovers) {
      const exists = await this.checkLogExists(album.id, 'cover');
      if (!exists) {
        await this.drizzle.db.insert(enrichmentLogs).values({
          entityId: album.id,
          entityType: 'album',
          entityName: album.name,
          provider: album.externalCoverSource || 'coverartarchive',
          metadataType: 'cover',
          status: 'success',
          fieldsUpdated: ['externalCoverPath', 'externalCoverSource'],
          previewUrl: `/api/images/albums/${album.id}/cover`,
          createdAt: album.externalInfoUpdatedAt || album.updatedAt,
        });
        albumCount++;
      }
    }

    const total = artistCount + albumCount;
    this.logger.info({ artistCount, albumCount, total }, 'Backfill enrichment logs completed');

    return { created: total, artists: artistCount, albums: albumCount };
  }

  private async checkLogExists(entityId: string, metadataType: string): Promise<boolean> {
    const result = await this.drizzle.db
      .select({ id: enrichmentLogs.id })
      .from(enrichmentLogs)
      .where(
        sql`${enrichmentLogs.entityId} = ${entityId} AND ${enrichmentLogs.metadataType} = ${metadataType}`
      )
      .limit(1);
    return result.length > 0;
  }
}
