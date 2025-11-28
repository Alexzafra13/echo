import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, genres, artistGenres, albumGenres, tracks, enrichmentLogs } from '@infrastructure/database/schema';
import {
  IArtistBioRetriever,
  IArtistImageRetriever,
  IAlbumCoverRetriever,
  MusicBrainzArtistMatch,
  MusicBrainzAlbumMatch,
} from '../domain/interfaces';
import { ArtistBio, ArtistImages, AlbumCover } from '../domain/entities';
import { AgentRegistryService } from '../infrastructure/services/agent-registry.service';
import { MetadataCacheService } from '../infrastructure/services/metadata-cache.service';
import { StorageService } from '../infrastructure/services/storage.service';
import { ImageDownloadService } from '../infrastructure/services/image-download.service';
import { SettingsService } from '../infrastructure/services/settings.service';
import { MetadataConflictService, ConflictPriority } from '../infrastructure/services/metadata-conflict.service';
import * as path from 'path';

/**
 * External Metadata Service
 * Orchestrates metadata enrichment from multiple external sources
 *
 * Design Pattern: Facade Pattern + Chain of Responsibility
 * Purpose: Provide a unified interface for metadata enrichment with local storage
 */
@Injectable()
export class ExternalMetadataService {
  private readonly logger = new Logger(ExternalMetadataService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly storage: StorageService,
    private readonly imageDownload: ImageDownloadService,
    private readonly settings: SettingsService,
    private readonly conflictService: MetadataConflictService,
    private readonly config: ConfigService
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
  ): Promise<{
    bioUpdated: boolean;
    imagesUpdated: boolean;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let bioUpdated = false;
    let imagesUpdated = false;

    try {
      // Get artist from database
      const artistResult = await this.drizzle.db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      const artist = artistResult[0];

      if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
      }

      this.logger.log(`Enriching artist: ${artist.name} (ID: ${artistId})`);

      // Step 1: Try to find MBID if missing
      if (!artist.mbzArtistId) {
        this.logger.log(`Artist "${artist.name}" missing MBID, searching MusicBrainz...`);
        try {
          const mbMatches = await this.searchArtistMbid(artist.name);

          if (mbMatches.length > 0) {
            const topMatch = mbMatches[0];

            // Auto-apply if score is very high (>90) - high confidence match
            if (topMatch.score >= 90) {
              await this.drizzle.db
                .update(artists)
                .set({
                  mbzArtistId: topMatch.mbid,
                  mbidSearchedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(artists.id, artistId));
              this.logger.log(
                `Auto-applied MBID for "${artist.name}": ${topMatch.mbid} (score: ${topMatch.score})`
              );
              // Update local reference
              artist.mbzArtistId = topMatch.mbid;
            }
            // Create conflict for manual review if score is medium (70-89)
            else if (topMatch.score >= 70) {
              const suggestions = mbMatches.slice(0, 3).map((m: MusicBrainzArtistMatch) =>
                `${m.name}${m.disambiguation ? ` (${m.disambiguation})` : ''} - MBID: ${m.mbid} (score: ${m.score})`
              ).join('\n');

              await this.conflictService.createConflict({
                entityId: artistId,
                entityType: 'artist',
                field: 'artistName',
                currentValue: artist.name,
                suggestedValue: `${topMatch.name}${topMatch.disambiguation ? ` (${topMatch.disambiguation})` : ''}`,
                source: 'musicbrainz' as any,
                priority: ConflictPriority.MEDIUM,
                metadata: {
                  artistName: artist.name,
                  suggestedMbid: topMatch.mbid,
                  score: topMatch.score,
                  allSuggestions: suggestions,
                },
              });
              this.logger.log(
                `Created MBID conflict for "${artist.name}": score ${topMatch.score}, needs manual review`
              );
              // Mark MBID as searched even if we created a conflict
              await this.drizzle.db
                .update(artists)
                .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
                .where(eq(artists.id, artistId));
            } else {
              this.logger.log(
                `Low confidence matches for "${artist.name}" (best: ${topMatch.score}), skipping MBID assignment`
              );
              // Mark MBID as searched even if confidence was too low
              await this.drizzle.db
                .update(artists)
                .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
                .where(eq(artists.id, artistId));
            }
          } else {
            this.logger.log(`No MusicBrainz matches found for "${artist.name}"`);
            // Mark MBID as searched even if no matches found
            await this.drizzle.db
              .update(artists)
              .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
              .where(eq(artists.id, artistId));
          }
        } catch (error) {
          this.logger.warn(`Error searching MBID for "${artist.name}": ${(error as Error).message}`);
          errors.push(`MBID search failed: ${(error as Error).message}`);
          // Mark MBID as searched even if there was an error (avoid infinite retries)
          await this.drizzle.db
            .update(artists)
            .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
            .where(eq(artists.id, artistId));
        }
      }

      // Enrich genres from MusicBrainz tags (if MBID is available)
      if (artist.mbzArtistId) {
        try {
          const genresAdded = await this.enrichArtistGenres(artistId, artist.mbzArtistId);
          if (genresAdded > 0) {
            this.logger.log(`Added ${genresAdded} genres for artist: ${artist.name}`);
          }
        } catch (error) {
          this.logger.warn(`Error enriching genres for "${artist.name}": ${(error as Error).message}`);
          errors.push(`Genre enrichment failed: ${(error as Error).message}`);
        }
      }

      // Enrich biography - Strategy based on source priority
      const bio = await this.getArtistBio(artist.mbzArtistId, artist.name, forceRefresh, artistId);
      if (bio) {
        const hasExistingBio = !!artist.biography;
        const isMusicBrainzSource = bio.source === 'musicbrainz';

        // Decision tree for applying vs creating conflict:
        // 1. No existing bio → Apply directly (auto-fill empty fields)
        // 2. Has bio + forceRefresh → Apply directly (user explicitly requested)
        // 3. Has bio → Create conflict for user review (ALL sources respect existing data)

        if (!hasExistingBio || forceRefresh) {
          // Apply the biography directly - only for empty fields or explicit refresh
          await this.drizzle.db
            .update(artists)
            .set({
              biography: bio.content,
              biographySource: bio.source,
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artistId));
          bioUpdated = true;
          this.logger.log(`Updated biography for: ${artist.name} (source: ${bio.source})`);

          // Log enrichment
          await this.createEnrichmentLog({
            entityId: artistId,
            entityType: 'artist',
            entityName: artist.name,
            provider: bio.source,
            metadataType: 'biography',
            status: 'success',
            fieldsUpdated: ['biography', 'biographySource'],
            processingTime: Date.now() - startTime,
          });
        } else {
          // Create conflict for user to review - respect existing data regardless of source

          // Skip if biography content is identical
          const currentBio = artist.biography || '';
          const suggestedBio = bio.content || '';

          if (currentBio.trim() === suggestedBio.trim()) {
            this.logger.debug(
              `Skipping biography conflict for "${artist.name}": content is identical (source: ${bio.source})`
            );
          } else {
            const currentBioPreview = currentBio
              ? currentBio.substring(0, 200) + '...'
              : '';
            const suggestedBioPreview = suggestedBio.substring(0, 200) + '...';

            await this.conflictService.createConflict({
              entityId: artistId,
              entityType: 'artist',
              field: 'biography',
              currentValue: currentBioPreview,
              suggestedValue: suggestedBioPreview,
              source: bio.source as any,
              priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
              metadata: {
                artistName: artist.name,
                currentSource: artist.biographySource,
                fullBioLength: bio.content.length,
              },
            });
            this.logger.log(
              `Created conflict for artist "${artist.name}": existing bio vs ${bio.source} suggestion`
            );
          }
        }
      }

      // Enrich images if not present or forceRefresh (V2 schema)
      const needsImages =
        forceRefresh ||
        !artist.externalProfilePath ||
        !artist.externalBackgroundPath ||
        !artist.externalBannerPath ||
        !artist.externalLogoPath;

      if (needsImages) {
        const images = await this.getArtistImages(artist.mbzArtistId, artist.name, forceRefresh, artistId);
        if (images) {
          // Download images locally (V2)
          const localPaths = await this.downloadArtistImages(artistId, images);

          const updateData: any = {};
          const now = new Date();

          // V2: Update external fields with individual timestamps
          if (forceRefresh || !artist.externalProfilePath) {
            if (localPaths.profileUrl) {
              updateData.externalProfilePath = localPaths.profileUrl;
              updateData.externalProfileSource = images.source;
              updateData.externalProfileUpdatedAt = now;
            }
          }
          if (forceRefresh || !artist.externalBackgroundPath) {
            if (localPaths.backgroundUrl) {
              updateData.externalBackgroundPath = localPaths.backgroundUrl;
              updateData.externalBackgroundSource = images.source;
              updateData.externalBackgroundUpdatedAt = now;
            }
          }
          if (forceRefresh || !artist.externalBannerPath) {
            if (localPaths.bannerUrl) {
              updateData.externalBannerPath = localPaths.bannerUrl;
              updateData.externalBannerSource = images.source;
              updateData.externalBannerUpdatedAt = now;
            }
          }
          if (forceRefresh || !artist.externalLogoPath) {
            if (localPaths.logoUrl) {
              updateData.externalLogoPath = localPaths.logoUrl;
              updateData.externalLogoSource = images.source;
              updateData.externalLogoUpdatedAt = now;
            }
          }

          // Update storage size
          updateData.metadataStorageSize = localPaths.totalSize;

          if (Object.keys(updateData).length > 0) {
            await this.drizzle.db
              .update(artists)
              .set({ ...updateData, updatedAt: new Date() })
              .where(eq(artists.id, artistId));
            imagesUpdated = true;
            this.logger.log(`Updated images for: ${artist.name} (${localPaths.totalSize} bytes)`);

            // Log enrichment
            await this.createEnrichmentLog({
              entityId: artistId,
              entityType: 'artist',
              entityName: artist.name,
              provider: images.source,
              metadataType: 'images',
              status: 'success',
              fieldsUpdated: Object.keys(updateData).filter(key => key.includes('Url') || key === 'metadataStorageSize'),
              processingTime: Date.now() - startTime,
              previewUrl: `/api/images/artists/${artistId}/profile`,
            });
          }
        }
      }

      // Log if there were errors but some operations succeeded
      if (errors.length > 0 && (bioUpdated || imagesUpdated)) {
        await this.createEnrichmentLog({
          entityId: artistId,
          entityType: 'artist',
          entityName: artist.name,
          provider: 'multiple',
          metadataType: 'mixed',
          status: 'partial',
          fieldsUpdated: [],
          errorMessage: errors.join('; '),
          processingTime: Date.now() - startTime,
        });
      }

      return { bioUpdated, imagesUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching artist ${artistId}: ${(error as Error).message}`, (error as Error).stack);
      errors.push((error as Error).message);

      // Log the error
      try {
        const artistResult = await this.drizzle.db
          .select({ name: artists.name })
          .from(artists)
          .where(eq(artists.id, artistId))
          .limit(1);
        await this.createEnrichmentLog({
          entityId: artistId,
          entityType: 'artist',
          entityName: artistResult[0]?.name || 'Unknown',
          provider: 'multiple',
          metadataType: 'mixed',
          status: 'error',
          fieldsUpdated: [],
          errorMessage: (error as Error).message,
          processingTime: Date.now() - startTime,
        });
      } catch (logError) {
        // Ignore logging errors
      }

      return { bioUpdated, imagesUpdated, errors };
    }
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
  ): Promise<{
    coverUpdated: boolean;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let coverUpdated = false;

    try {
      // Get album from database
      const albumResult = await this.drizzle.db
        .select({
          album: albums,
          artistName: artists.name,
          artistMbzId: artists.mbzArtistId,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(eq(albums.id, albumId))
        .limit(1);
      const album = albumResult[0]?.album;
      const artistData = albumResult[0] ? { name: albumResult[0].artistName, mbzArtistId: albumResult[0].artistMbzId } : null;

      if (!album) {
        throw new Error(`Album not found: ${albumId}`);
      }

      const artistName = artistData?.name || 'Unknown Artist';
      this.logger.log(`Enriching album: ${album.name} by ${artistName} (ID: ${albumId})`);

      // Step 1: Try to find MBID if missing
      if (!album.mbzAlbumId) {
        this.logger.log(`Album "${album.name}" missing MBID, searching MusicBrainz...`);
        try {
          const mbMatches = await this.searchAlbumMbid(album.name, artistName);

          if (mbMatches.length > 0) {
            const topMatch = mbMatches[0];

            // Auto-apply if score is very high (>90) - high confidence match
            if (topMatch.score >= 90) {
              await this.drizzle.db
                .update(albums)
                .set({
                  mbzAlbumId: topMatch.mbid,
                  mbidSearchedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(albums.id, albumId));
              this.logger.log(
                `Auto-applied MBID for "${album.name}": ${topMatch.mbid} (score: ${topMatch.score})`
              );
              // Update local reference
              (album as any).mbzAlbumId = topMatch.mbid;
            }
            // Create conflict for manual review if score is medium (70-89)
            else if (topMatch.score >= 70) {
              const suggestions = mbMatches.slice(0, 3).map((m: MusicBrainzAlbumMatch) =>
                `${m.title} by ${m.artistName}${m.disambiguation ? ` (${m.disambiguation})` : ''} - MBID: ${m.mbid} (score: ${m.score})`
              ).join('\n');

              await this.conflictService.createConflict({
                entityId: albumId,
                entityType: 'album',
                field: 'albumName',
                currentValue: album.name,
                suggestedValue: `${topMatch.title}${topMatch.disambiguation ? ` (${topMatch.disambiguation})` : ''}`,
                source: 'musicbrainz' as any,
                priority: ConflictPriority.MEDIUM,
                metadata: {
                  albumName: album.name,
                  artistName,
                  suggestedMbid: topMatch.mbid,
                  score: topMatch.score,
                  allSuggestions: suggestions,
                },
              });
              this.logger.log(
                `Created MBID conflict for "${album.name}": score ${topMatch.score}, needs manual review`
              );
              // Mark MBID as searched even if we created a conflict
              await this.drizzle.db
                .update(albums)
                .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
                .where(eq(albums.id, albumId));
            } else {
              this.logger.log(
                `Low confidence matches for "${album.name}" (best: ${topMatch.score}), skipping MBID assignment`
              );
              // Mark MBID as searched even if confidence was too low
              await this.drizzle.db
                .update(albums)
                .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
                .where(eq(albums.id, albumId));
            }
          } else {
            this.logger.log(`No MusicBrainz matches found for "${album.name}"`);
            // Mark MBID as searched even if no matches found
            await this.drizzle.db
              .update(albums)
              .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
              .where(eq(albums.id, albumId));
          }
        } catch (error) {
          this.logger.warn(`Error searching MBID for "${album.name}": ${(error as Error).message}`);
          errors.push(`MBID search failed: ${(error as Error).message}`);
          // Mark MBID as searched even if there was an error (avoid infinite retries)
          await this.drizzle.db
            .update(albums)
            .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
            .where(eq(albums.id, albumId));
        }
      }

      // Enrich genres from MusicBrainz tags (if MBID is available)
      if (album.mbzAlbumId) {
        try {
          const genresAdded = await this.enrichAlbumGenres(albumId, album.mbzAlbumId);
          if (genresAdded > 0) {
            this.logger.log(`Added ${genresAdded} genres for album: ${album.name}`);
          }
        } catch (error) {
          this.logger.warn(`Error enriching genres for "${album.name}": ${(error as Error).message}`);
          errors.push(`Genre enrichment failed: ${(error as Error).message}`);
        }
      }

      // Enrich cover - Strategy based on source priority
      if (album.mbzAlbumId) {
        const cover = await this.getAlbumCover(
          album.mbzAlbumId,
          artistData?.mbzArtistId || null, // Pass artist MBID for Fanart.tv
          artistName,
          album.name,
          forceRefresh,
          albumId
        );

        if (cover) {
          const isMusicBrainzSource = cover.source === 'coverartarchive' || cover.source === 'musicbrainz';
          const hasExistingCover = !!album.externalCoverPath;

          // Decision tree for applying vs creating conflict:
          // 1. No existing cover → Apply directly (auto-fill empty fields)
          // 2. Has cover + forceRefresh → Apply directly (user explicitly requested)
          // 3. Has cover → Create conflict for user review (ALL sources respect existing data)

          if (!hasExistingCover || forceRefresh) {
            // Apply the cover directly - only for empty fields or explicit refresh
            const localPath = await this.downloadAlbumCover(albumId, cover);

            await this.drizzle.db
              .update(albums)
              .set({
                externalCoverPath: localPath,
                externalCoverSource: cover.source,
                externalInfoUpdatedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(albums.id, albumId));
            coverUpdated = true;
            this.logger.log(`Updated cover for: ${album.name} (source: ${cover.source})`);

            // Log enrichment
            await this.createEnrichmentLog({
              entityId: albumId,
              entityType: 'album',
              entityName: album.name,
              provider: cover.source,
              metadataType: 'cover',
              status: 'success',
              fieldsUpdated: ['externalCoverPath', 'externalCoverSource'],
              processingTime: Date.now() - startTime,
              previewUrl: `/api/images/albums/${albumId}/cover`,
            });
          } else {
            // Create conflict for user to review - respect existing data regardless of source

            // Get current cover from physical files (coverArtPath) - this is the REAL cover from embedded metadata
            // NOT from external sources (externalCoverPath)
            let currentCoverUrl: string | undefined = undefined;
            let currentDimensions = null;
            let currentCoverSource: 'physical' | 'external' | null = null;

            // Priority 1: Use cover from physical files (extracted from music files)
            if (album.coverArtPath) {
              currentDimensions = await this.imageDownload.getImageDimensionsFromFile(album.coverArtPath);

              if (currentDimensions) {
                currentCoverUrl = `/api/images/albums/${albumId}/cover`;
                currentCoverSource = 'physical';
                this.logger.debug(
                  `Using physical cover for "${album.name}": ${album.coverArtPath}`
                );
              } else {
                this.logger.warn(
                  `Album "${album.name}" has coverArtPath but file doesn't exist: ${album.coverArtPath}`
                );
              }
            }

            // Fallback: Use external cover if no physical cover exists
            if (!currentDimensions && album.externalCoverPath) {
              currentDimensions = await this.imageDownload.getImageDimensionsFromFile(album.externalCoverPath);

              if (currentDimensions) {
                currentCoverUrl = `/api/images/albums/${albumId}/cover`;
                currentCoverSource = 'external';
                this.logger.debug(
                  `Using external cover for "${album.name}" (no physical cover): ${album.externalCoverPath}`
                );
              } else {
                this.logger.warn(
                  `Album "${album.name}" has externalCoverPath but file doesn't exist: ${album.externalCoverPath}`
                );
              }
            }

            const suggestedDimensions = await this.imageDownload.getImageDimensionsFromUrl(cover.largeUrl);

            // Only create conflict if suggested resolution was detected and meets quality criteria
            if (!suggestedDimensions) {
              this.logger.warn(
                `Skipping cover conflict for "${album.name}": couldn't detect resolution of suggested cover from ${cover.source}`
              );
            } else {
              // Check if this is a quality improvement
              const isQualityImprovement = currentDimensions && suggestedDimensions
                ? this.imageDownload.isSignificantImprovement(currentDimensions, suggestedDimensions)
                : false;

              // Check if current cover is low quality (<500px)
              const isLowQuality = currentDimensions
                ? (currentDimensions.width < 500 || currentDimensions.height < 500)
                : false;

              // Format resolution strings
              const currentResolution = currentDimensions
                ? `${currentDimensions.width}×${currentDimensions.height}`
                : undefined;

              const suggestedResolution = `${suggestedDimensions.width}×${suggestedDimensions.height}`;

              // Check if should skip this suggestion
              let shouldSkip = false;
              let skipReason = '';

              // Skip if resolutions are identical
              if (currentResolution && currentResolution === suggestedResolution) {
                shouldSkip = true;
                skipReason = `resolutions are identical (${currentResolution})`;
              }
              // Skip if current resolution is better or equal (and not low quality)
              else if (currentDimensions && !isQualityImprovement && !isLowQuality) {
                const currentPixels = currentDimensions.width * currentDimensions.height;
                const suggestedPixels = suggestedDimensions.width * suggestedDimensions.height;
                shouldSkip = true;
                skipReason = `current resolution (${currentResolution}, ${currentPixels}px) is equal or better than suggested (${suggestedResolution}, ${suggestedPixels}px)`;
              }

              if (shouldSkip) {
                this.logger.debug(
                  `Skipping cover conflict for "${album.name}": ${skipReason} from ${cover.source}`
                );
              } else {
                // Create the conflict - this is a genuine quality improvement
                this.logger.log(
                  `Cover comparison for "${album.name}": ` +
                  `Current: ${currentResolution || 'none'} → Suggested: ${suggestedResolution} ` +
                  `(Quality improvement: ${isQualityImprovement}, Low quality: ${isLowQuality})`
                );

                await this.conflictService.createConflict({
                  entityId: albumId,
                  entityType: 'album',
                  field: 'externalCover',
                  currentValue: currentCoverUrl,
                  suggestedValue: cover.largeUrl,
                  source: cover.source as any,
                  priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
                  metadata: {
                    albumName: album.name,
                    artistName,
                    currentSource: currentCoverSource === 'physical' ? 'embedded' : (album.externalCoverSource || 'unknown'),
                    currentCoverType: currentCoverSource, // 'physical' | 'external' | null
                    currentResolution,
                    suggestedResolution,
                    qualityImprovement: isQualityImprovement,
                    isLowQuality,
                  },
                });
                this.logger.log(
                  `Created conflict for album "${album.name}": existing cover vs ${cover.source} suggestion`
                );
              }
            }
          }
        }
      }

      // Log if there were errors but some operations succeeded
      if (errors.length > 0 && coverUpdated) {
        await this.createEnrichmentLog({
          entityId: albumId,
          entityType: 'album',
          entityName: album.name,
          provider: 'multiple',
          metadataType: 'cover',
          status: 'partial',
          fieldsUpdated: [],
          errorMessage: errors.join('; '),
          processingTime: Date.now() - startTime,
        });
      }

      return { coverUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching album ${albumId}: ${(error as Error).message}`, (error as Error).stack);
      errors.push((error as Error).message);

      // Log the error
      try {
        const albumResult = await this.drizzle.db
          .select({ name: albums.name })
          .from(albums)
          .where(eq(albums.id, albumId))
          .limit(1);
        await this.createEnrichmentLog({
          entityId: albumId,
          entityType: 'album',
          entityName: albumResult[0]?.name || 'Unknown',
          provider: 'multiple',
          metadataType: 'cover',
          status: 'error',
          fieldsUpdated: [],
          errorMessage: (error as Error).message,
          processingTime: Date.now() - startTime,
        });
      } catch (logError) {
        // Ignore logging errors
      }

      return { coverUpdated, errors };
    }
  }

  /**
   * Download artist images from external URLs and save locally (V2)
   * Returns local paths for all images using new schema
   */
  private async downloadArtistImages(
    artistId: string,
    images: ArtistImages
  ): Promise<{
    profileUrl: string | null;
    backgroundUrl: string | null;
    bannerUrl: string | null;
    logoUrl: string | null;
    totalSize: number;
  }> {
    const basePath = await this.storage.getArtistMetadataPath(artistId);
    let totalSize = 0;

    const result = {
      profileUrl: null as string | null,
      backgroundUrl: null as string | null,
      bannerUrl: null as string | null,
      logoUrl: null as string | null,
      totalSize: 0,
    };

    // V2: Download single unified profile image (prioritize large > medium > small)
    const profileUrl = images.largeUrl || images.mediumUrl || images.smallUrl;
    if (profileUrl) {
      try {
        const filePath = path.join(basePath, 'profile.jpg');
        await this.imageDownload.downloadAndSave(profileUrl, filePath);
        result.profileUrl = 'profile.jpg'; // Store only filename (not full path) for portability
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download profile image: ${(error as Error).message}`);
      }
    }

    // Download background (for Hero section)
    if (images.backgroundUrl) {
      try {
        const filePath = path.join(basePath, 'background.jpg');
        await this.imageDownload.downloadAndSave(images.backgroundUrl, filePath);
        result.backgroundUrl = 'background.jpg'; // Store only filename (not full path) for portability
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download background image: ${(error as Error).message}`);
      }
    }

    // Download banner
    if (images.bannerUrl) {
      try {
        const filePath = path.join(basePath, 'banner.png');
        await this.imageDownload.downloadAndSave(images.bannerUrl, filePath);
        result.bannerUrl = 'banner.png'; // Store only filename (not full path) for portability
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download banner image: ${(error as Error).message}`);
      }
    }

    // Download logo
    if (images.logoUrl) {
      try {
        const filePath = path.join(basePath, 'logo.png');
        await this.imageDownload.downloadAndSave(images.logoUrl, filePath);
        result.logoUrl = 'logo.png'; // Store only filename (not full path) for portability
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download logo image: ${(error as Error).message}`);
      }
    }

    result.totalSize = totalSize;
    return result;
  }

  /**
   * Download album cover and save it
   * Saves to album folder as cover.jpg (if configured) or to metadata storage
   * Priority: ENV vars > Database settings > Defaults
   */
  private async downloadAlbumCover(
    albumId: string,
    cover: AlbumCover
  ): Promise<string> {
    // Priority: ENV > DB > default
    const envSaveInFolder = this.config.get<string>('METADATA_SAVE_COVERS_IN_ALBUM_FOLDER');
    const saveInFolder = envSaveInFolder !== undefined
      ? envSaveInFolder === 'true'
      : await this.settings.getBoolean(
          'metadata.download.save_in_album_folder',
          false  // Default: save to metadata storage (music folder is read-only)
        );

    let coverPath: string;

    if (saveInFolder) {
      // Get album to find its folder path
      const trackResult = await this.drizzle.db
        .select({ path: tracks.path })
        .from(tracks)
        .where(eq(tracks.albumId, albumId))
        .limit(1);

      if (trackResult[0]) {
        // Get album folder from first track path
        const albumFolder = path.dirname(trackResult[0].path);
        coverPath = path.join(albumFolder, 'cover.jpg');
      } else {
        // Fallback to metadata storage
        const metadataPath = await this.storage.getAlbumMetadataPath(albumId);
        coverPath = path.join(metadataPath, 'cover.jpg');
      }
    } else {
      // Save to metadata storage
      const metadataPath = await this.storage.getAlbumMetadataPath(albumId);
      coverPath = path.join(metadataPath, 'cover.jpg');
    }

    // Download the best quality cover (large)
    await this.imageDownload.downloadAndSave(cover.largeUrl, coverPath);

    return coverPath;
  }

  /**
   * Get artist biography using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getArtistBio(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean,
    artistId?: string
  ): Promise<ArtistBio | null> {
    // Check cache first (use internal artistId for consistent UUID-based caching)
    if (!forceRefresh && artistId) {
      const cached = await this.cache.get('artist', artistId, 'bio');
      if (cached) {
        return new ArtistBio(
          cached.content,
          cached.summary,
          cached.url,
          cached.source
        );
      }
    }

    // Try agents in priority order
    const agents = this.agentRegistry.getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever');

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for bio: ${name}`);
        const bio = await agent.getArtistBio(mbzArtistId, name);

        if (bio && bio.hasContent()) {
          // Cache the result (use internal artistId for consistent caching)
          // IMPORTANT: Use 'bio' as provider key for consistent cache lookup (not bio.source)
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
        this.logger.warn(`Agent "${agent.name}" failed for bio ${name}: ${(error as Error).message}`);
      }
    }

    this.logger.debug(`No biography found for: ${name}`);
    return null;
  }

  /**
   * Get artist images using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getArtistImages(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean,
    artistId?: string
  ): Promise<ArtistImages | null> {
    // Check cache first (use internal artistId for consistent UUID-based caching)
    if (!forceRefresh && artistId) {
      const cached = await this.cache.get('artist', artistId, 'images');
      if (cached) {
        return new ArtistImages(
          cached.smallUrl,
          cached.mediumUrl,
          cached.largeUrl,
          cached.backgroundUrl,
          cached.bannerUrl,
          cached.logoUrl,
          cached.source
        );
      }
    }

    // Try agents in priority order
    const agents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>('IArtistImageRetriever');

    // Collect images from all agents and merge them
    let mergedImages: ArtistImages | null = null;

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for images: ${name}`);
        const images = await agent.getArtistImages(mbzArtistId, name);

        if (images) {
          if (!mergedImages) {
            mergedImages = images;
          } else {
            // Merge images (prefer existing values)
            mergedImages = new ArtistImages(
              mergedImages.smallUrl || images.smallUrl,
              mergedImages.mediumUrl || images.mediumUrl,
              mergedImages.largeUrl || images.largeUrl,
              mergedImages.backgroundUrl || images.backgroundUrl,
              mergedImages.bannerUrl || images.bannerUrl,
              mergedImages.logoUrl || images.logoUrl,
              `${mergedImages.source},${images.source}`
            );
          }

          // Stop if we have all image types
          if (mergedImages.hasHeroAssets() && mergedImages.getBestProfileUrl()) {
            break;
          }
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for images ${name}: ${(error as Error).message}`);
      }
    }

    if (mergedImages) {
      // Cache the merged result (use internal artistId for consistent caching)
      // IMPORTANT: Use 'images' as provider key for consistent cache lookup (not mergedImages.source)
      if (artistId) {
        await this.cache.set('artist', artistId, 'images', {
          smallUrl: mergedImages.smallUrl,
          mediumUrl: mergedImages.mediumUrl,
          largeUrl: mergedImages.largeUrl,
          backgroundUrl: mergedImages.backgroundUrl,
          bannerUrl: mergedImages.bannerUrl,
          logoUrl: mergedImages.logoUrl,
          source: mergedImages.source,
        });
      }

      return mergedImages;
    }

    this.logger.debug(`No images found for: ${name}`);
    return null;
  }

  /**
   * Get album cover using agent chain
   * Tries each agent in priority order until one succeeds
   */
  private async getAlbumCover(
    mbzAlbumId: string | null,
    mbzArtistId: string | null,
    artist: string,
    album: string,
    forceRefresh: boolean,
    albumId?: string
  ): Promise<AlbumCover | null> {
    // Check cache first (use internal albumId for consistent UUID-based caching)
    if (!forceRefresh && albumId) {
      const cached = await this.cache.get('album', albumId, 'cover');
      if (cached) {
        return new AlbumCover(
          cached.smallUrl,
          cached.mediumUrl,
          cached.largeUrl,
          cached.source
        );
      }
    }

    // Try agents in priority order
    const agents = this.agentRegistry.getAgentsFor<IAlbumCoverRetriever>('IAlbumCoverRetriever');

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for cover: ${artist} - ${album}`);

        // Fanart.tv needs special handling - requires artist MBID
        if (agent.name === 'fanart' && mbzArtistId && mbzAlbumId) {
          const fanartAgent = agent as any;
          if (fanartAgent.getAlbumCoverByArtist) {
            const cover = await fanartAgent.getAlbumCoverByArtist(mbzArtistId, mbzAlbumId, artist, album);
            if (cover) {
              // Cache the result (use internal albumId for consistent caching)
              // Always use 'cover' as provider for consistent cache keys
              if (albumId) {
                await this.cache.set('album', albumId, 'cover', {
                  smallUrl: cover.smallUrl,
                  mediumUrl: cover.mediumUrl,
                  largeUrl: cover.largeUrl,
                  source: cover.source,
                });
              }
              return cover;
            }
          }
          continue; // Skip standard getAlbumCover for Fanart
        }

        // Standard agents (Cover Art Archive, etc.)
        const cover = await agent.getAlbumCover(mbzAlbumId, artist, album);

        if (cover) {
          // Cache the result (use internal albumId for consistent caching)
          // Always use 'cover' as provider for consistent cache keys
          if (albumId) {
            await this.cache.set('album', albumId, 'cover', {
              smallUrl: cover.smallUrl,
              mediumUrl: cover.mediumUrl,
              largeUrl: cover.largeUrl,
              source: cover.source,
            });
          }

          return cover;
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for cover ${artist} - ${album}: ${(error as Error).message}`);
      }
    }

    this.logger.debug(`No cover found for: ${artist} - ${album}`);
    return null;
  }

  /**
   * Search for artist MBID in MusicBrainz
   * Returns array of matches sorted by score
   */
  private async searchArtistMbid(artistName: string) {
    const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
    if (!mbAgent || !mbAgent.isEnabled()) {
      this.logger.debug('MusicBrainz search agent not available');
      return [];
    }

    try {
      return await (mbAgent as any).searchArtist(artistName, 5);
    } catch (error) {
      this.logger.error(`Error searching MusicBrainz for artist: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Search for album MBID in MusicBrainz
   * Returns array of matches sorted by score
   */
  private async searchAlbumMbid(albumTitle: string, artistName?: string) {
    const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
    if (!mbAgent || !mbAgent.isEnabled()) {
      this.logger.debug('MusicBrainz search agent not available');
      return [];
    }

    try {
      return await (mbAgent as any).searchAlbum(albumTitle, artistName, 5);
    } catch (error) {
      this.logger.error(`Error searching MusicBrainz for album: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Enrich artist with genre tags from MusicBrainz
   * Fetches tags using the artist's MBID and saves them to the database
   *
   * @param artistId Internal artist ID
   * @param mbzArtistId MusicBrainz Artist ID
   * @returns Number of genres saved
   */
  private async enrichArtistGenres(artistId: string, mbzArtistId: string): Promise<number> {
    try {
      // Get MB agent
      const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
      if (!mbAgent || !mbAgent.isEnabled()) {
        return 0;
      }

      // Fetch artist details with tags
      const artistData = await (mbAgent as any).getArtistByMbid(mbzArtistId);
      if (!artistData || !artistData.tags || artistData.tags.length === 0) {
        return 0;
      }

      // Only take top genres (with count >= 3 for quality)
      const topTags = artistData.tags
        .filter((tag: any) => tag.count >= 3)
        .slice(0, 10); // Max 10 genres per artist

      if (topTags.length === 0) {
        return 0;
      }

      // Upsert genres and associate with artist
      let savedCount = 0;
      for (const tag of topTags) {
        try {
          // Normalize genre name
          const genreName = tag.name.charAt(0).toUpperCase() + tag.name.slice(1);

          // Upsert genre - find or create
          let genreResult = await this.drizzle.db
            .select({ id: genres.id })
            .from(genres)
            .where(eq(genres.name, genreName))
            .limit(1);

          if (!genreResult[0]) {
            const newGenre = await this.drizzle.db
              .insert(genres)
              .values({ name: genreName })
              .onConflictDoNothing({ target: genres.name })
              .returning({ id: genres.id });

            if (!newGenre[0]) {
              // Race condition - fetch again
              genreResult = await this.drizzle.db
                .select({ id: genres.id })
                .from(genres)
                .where(eq(genres.name, genreName))
                .limit(1);
            } else {
              genreResult = newGenre;
            }
          }

          const genre = genreResult[0];
          if (genre) {
            // Associate with artist (skip if already exists)
            await this.drizzle.db
              .insert(artistGenres)
              .values({ artistId, genreId: genre.id })
              .onConflictDoNothing();

            savedCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to save genre "${tag.name}" for artist: ${(error as Error).message}`);
        }
      }

      this.logger.debug(`Saved ${savedCount} genres for artist ${artistId}`);
      return savedCount;
    } catch (error) {
      this.logger.error(`Error enriching artist genres: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Enrich album with genre tags from MusicBrainz
   * Fetches tags using the album's MBID and saves them to the database
   *
   * @param albumId Internal album ID
   * @param mbzAlbumId MusicBrainz Release-Group ID
   * @returns Number of genres saved
   */
  private async enrichAlbumGenres(albumId: string, mbzAlbumId: string): Promise<number> {
    try {
      // Get MB agent
      const mbAgent = this.agentRegistry.getAgentsFor('IMusicBrainzSearch')[0];
      if (!mbAgent || !mbAgent.isEnabled()) {
        return 0;
      }

      // Fetch album details with tags
      const albumData = await (mbAgent as any).getAlbumByMbid(mbzAlbumId);
      if (!albumData || !albumData.tags || albumData.tags.length === 0) {
        return 0;
      }

      // Only take top genres (with count >= 3 for quality)
      const topTags = albumData.tags
        .filter((tag: any) => tag.count >= 3)
        .slice(0, 10); // Max 10 genres per album

      if (topTags.length === 0) {
        return 0;
      }

      // Upsert genres and associate with album
      let savedCount = 0;
      for (const tag of topTags) {
        try {
          // Normalize genre name
          const genreName = tag.name.charAt(0).toUpperCase() + tag.name.slice(1);

          // Upsert genre - find or create
          let genreResult = await this.drizzle.db
            .select({ id: genres.id })
            .from(genres)
            .where(eq(genres.name, genreName))
            .limit(1);

          if (!genreResult[0]) {
            const newGenre = await this.drizzle.db
              .insert(genres)
              .values({ name: genreName })
              .onConflictDoNothing({ target: genres.name })
              .returning({ id: genres.id });

            if (!newGenre[0]) {
              // Race condition - fetch again
              genreResult = await this.drizzle.db
                .select({ id: genres.id })
                .from(genres)
                .where(eq(genres.name, genreName))
                .limit(1);
            } else {
              genreResult = newGenre;
            }
          }

          const genre = genreResult[0];
          if (genre) {
            // Associate with album (skip if already exists)
            await this.drizzle.db
              .insert(albumGenres)
              .values({ albumId, genreId: genre.id })
              .onConflictDoNothing();

            savedCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to save genre "${tag.name}" for album: ${(error as Error).message}`);
        }
      }

      this.logger.debug(`Saved ${savedCount} genres for album ${albumId}`);
      return savedCount;
    } catch (error) {
      this.logger.error(`Error enriching album genres: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Create an enrichment log entry
   * Records metadata enrichment operations for tracking and analytics
   */
  private async createEnrichmentLog(data: {
    entityId: string;
    entityType: 'artist' | 'album';
    entityName: string;
    provider: string;
    metadataType: string;
    status: 'success' | 'partial' | 'error';
    fieldsUpdated: string[];
    errorMessage?: string;
    previewUrl?: string;
    processingTime?: number;
  }): Promise<void> {
    try {
      await this.drizzle.db
        .insert(enrichmentLogs)
        .values({
          entityId: data.entityId,
          entityType: data.entityType,
          entityName: data.entityName,
          provider: data.provider,
          metadataType: data.metadataType,
          status: data.status,
          fieldsUpdated: data.fieldsUpdated,
          errorMessage: data.errorMessage,
          previewUrl: data.previewUrl,
          processingTime: data.processingTime,
        });
    } catch (error) {
      // Don't throw - logging failure shouldn't break the enrichment process
      this.logger.error(`Failed to create enrichment log: ${(error as Error).message}`);
    }
  }
}
