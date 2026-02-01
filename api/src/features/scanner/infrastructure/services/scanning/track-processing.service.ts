import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { tracks, albums, artists } from '@infrastructure/database/schema';
import { FileScannerService } from '../file-scanner.service';
import { MetadataExtractorService } from '../metadata-extractor.service';
import { MbidAutoSearchService } from '@features/external-metadata/infrastructure/services/mbid-auto-search.service';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { EntityCreationService } from './entity-creation.service';
import { LibraryStatsService } from './library-stats.service';
import { TrackGenreService } from './track-genre.service';

export type ProcessFileResult = 'added' | 'updated' | 'skipped';

/**
 * Tracker for scan progress statistics
 */
export class ScanProgressTracker {
  filesScanned = 0;
  totalFiles = 0;
  tracksCreated = 0;
  tracksSkipped = 0;
  albumsCreated = 0;
  artistsCreated = 0;
  coversExtracted = 0;
  errors = 0;

  get progress(): number {
    if (this.totalFiles === 0) return 0;
    return Math.round((this.filesScanned / this.totalFiles) * 100);
  }
}

/**
 * Service for processing individual music files
 * Extracts metadata and creates/updates database records
 */
@Injectable()
export class TrackProcessingService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly fileScanner: FileScannerService,
    private readonly metadataExtractor: MetadataExtractorService,
    private readonly entityCreation: EntityCreationService,
    private readonly libraryStats: LibraryStatsService,
    private readonly trackGenres: TrackGenreService,
    private readonly mbidAutoSearchService: MbidAutoSearchService,
    private readonly logService: LogService,
    @InjectPinoLogger(TrackProcessingService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Process a single music file atomically
   *
   * Following Navidrome's architecture:
   * 1. Extract metadata from file
   * 2. Find or create artist
   * 3. Find or create album (linked to artist)
   * 4. Create or update track (linked to album and artist)
   *
   * @param filePath - Path to the music file
   * @param tracker - Optional progress tracker
   * @param lastScanTime - Optional timestamp for incremental scanning
   * @returns 'added', 'updated', or 'skipped'
   */
  async processFile(
    filePath: string,
    tracker?: ScanProgressTracker,
    lastScanTime?: Date | null,
  ): Promise<ProcessFileResult> {
    try {
      // Check if file changed (incremental scan)
      if (lastScanTime) {
        const shouldSkip = await this.shouldSkipFile(filePath, lastScanTime);
        if (shouldSkip) {
          return 'skipped';
        }
      }

      // Extract metadata
      const metadata = await this.metadataExtractor.extractMetadata(filePath);
      if (!metadata) {
        this.logger.warn(`⚠️  No se pudieron extraer metadatos de ${filePath}`);
        await this.logService.error(
          LogCategory.SCANNER,
          `Fallo al extraer metadatos del archivo`,
          {
            details: JSON.stringify({
              filePath,
              fileExtension: path.extname(filePath),
              reason: 'metadata_extraction_failed',
            }),
          },
        );
        return 'skipped';
      }

      const stats = await this.fileScanner.getFileStats(filePath);
      const size = stats ? stats.size : 0;

      // Find or create artist
      const artistName = metadata.albumArtist || metadata.artist || 'Unknown Artist';
      const mbzArtistId = Array.isArray(metadata.musicBrainzArtistId)
        ? metadata.musicBrainzArtistId[0]
        : metadata.musicBrainzArtistId;

      const artist = await this.entityCreation.findOrCreateArtist(artistName, mbzArtistId);

      if (artist.created && tracker) {
        tracker.artistsCreated++;
      }

      // Auto-search MBID for new artists
      if (!mbzArtistId && artist.created) {
        this.mbidAutoSearchService
          .searchArtistMbid(artist.id, artistName, true)
          .catch((error) => {
            this.logger.warn(`Auto-search MBID failed for artist "${artistName}": ${error.message}`);
          });
      }

      // Find or create album
      const albumName = metadata.album || 'Unknown Album';
      const mbzAlbumId = metadata.musicBrainzAlbumId;
      const mbzAlbumArtistId = Array.isArray(metadata.musicBrainzAlbumArtistId)
        ? metadata.musicBrainzAlbumArtistId[0]
        : metadata.musicBrainzAlbumArtistId;

      const album = await this.entityCreation.findOrCreateAlbum(
        albumName,
        artist.id,
        {
          year: metadata.year,
          compilation: metadata.compilation,
          mbzAlbumId,
          mbzAlbumArtistId,
        },
        filePath,
      );

      if (tracker) {
        if (album.created) tracker.albumsCreated++;
        if (album.coverExtracted) tracker.coversExtracted++;
      }

      // Auto-search MBID for new albums
      if (!mbzAlbumId && album.created) {
        this.mbidAutoSearchService
          .searchAlbumMbid(album.id, albumName, artistName, true)
          .catch((error) => {
            this.logger.warn(`Auto-search MBID failed for album "${albumName}": ${error.message}`);
          });
      }

      // Log warning for tracks without basic metadata
      if (!metadata.title && !metadata.artist && !metadata.album) {
        await this.logService.warning(
          LogCategory.SCANNER,
          `Track sin metadatos básicos (título, artista, álbum)`,
          {
            details: JSON.stringify({
              filePath,
              hasTitle: !!metadata.title,
              hasArtist: !!metadata.artist,
              hasAlbum: !!metadata.album,
              fileName: path.basename(filePath),
            }),
          },
        );
      }

      // Prepare track data
      // Note: ReplayGain values from file tags are only used if present in metadata.
      // If not present (undefined), we don't include them in trackData to avoid
      // overwriting LUFS-analyzed values during re-scans.
      const hasEmbeddedReplayGain = metadata.rgTrackGain !== undefined;

      const trackData = {
        title: metadata.title || path.basename(filePath, path.extname(filePath)),
        artistName: metadata.artist || artist.name,
        albumName: album.name,
        albumArtistName: metadata.albumArtist || artist.name,
        artistId: artist.id,
        albumId: album.id,
        albumArtistId: artist.id,
        trackNumber: metadata.trackNumber,
        discNumber: metadata.discNumber || 1,
        year: metadata.year,
        duration: metadata.duration,
        bitRate: metadata.bitRate,
        channels: metadata.channels,
        size: Number(size),
        suffix: this.fileScanner.getFileExtension(filePath),
        path: filePath,
        hasCoverArt: metadata.coverArt || false,
        compilation: metadata.compilation || false,
        comment: typeof metadata.comment === 'object' && metadata.comment?.text
          ? metadata.comment.text
          : typeof metadata.comment === 'string'
            ? metadata.comment
            : null,
        lyrics: metadata.lyrics,
        // Only include ReplayGain values if embedded in file tags.
        // This prevents overwriting LUFS-analyzed values during re-scans.
        ...(hasEmbeddedReplayGain && {
          rgTrackGain: metadata.rgTrackGain,
          rgTrackPeak: metadata.rgTrackPeak ?? null,
          rgAlbumGain: metadata.rgAlbumGain ?? null,
          rgAlbumPeak: metadata.rgAlbumPeak ?? null,
          // If file has embedded ReplayGain, mark as analyzed to skip LUFS analysis
          lufsAnalyzedAt: new Date(),
        }),
        mbzTrackId: metadata.musicBrainzTrackId,
        mbzAlbumId: mbzAlbumId,
        mbzArtistId: mbzArtistId,
        mbzAlbumArtistId: mbzAlbumArtistId,
        // DJ/Audio analysis from ID3 tags (TBPM, TKEY)
        bpm: metadata.bpm ?? null,
        initialKey: metadata.initialKey ?? null,
      };

      // Check if track exists (need albumId to detect album changes)
      const existingTrackResult = await this.drizzle.db
        .select({ id: tracks.id, albumId: tracks.albumId })
        .from(tracks)
        .where(eq(tracks.path, filePath))
        .limit(1);
      const existingTrack = existingTrackResult[0];

      let result: ProcessFileResult;

      if (existingTrack) {
        // Track exists - check if album changed (metadata correction)
        const oldAlbumId = existingTrack.albumId;
        const albumChanged = oldAlbumId !== album.id;

        // Update existing track
        // Clear missingAt if file reappeared (was marked as missing before)
        await this.drizzle.db
          .update(tracks)
          .set({
            ...trackData,
            missingAt: null, // Clear missing status - file exists again
            updatedAt: new Date(),
          })
          .where(eq(tracks.id, existingTrack.id));

        await this.trackGenres.saveTrackGenres(existingTrack.id, metadata.genre);
        await this.libraryStats.updateStats(album.id, artist.id);

        // If album changed, check if old album is now orphaned
        if (albumChanged && oldAlbumId) {
          await this.cleanupOrphanedAlbum(oldAlbumId);
        }

        result = 'updated';
      } else {
        // Create new track
        const newTrackResult = await this.drizzle.db
          .insert(tracks)
          .values(trackData)
          .returning();
        const newTrack = newTrackResult[0];

        await this.trackGenres.saveTrackGenres(newTrack.id, metadata.genre);

        // Auto-search MBID for new tracks
        if (!metadata.musicBrainzTrackId) {
          this.mbidAutoSearchService
            .searchTrackMbid(
              newTrack.id,
              {
                artist: metadata.artist || artistName,
                album: albumName,
                title: metadata.title || path.basename(filePath, path.extname(filePath)),
                trackNumber: metadata.trackNumber,
                duration: metadata.duration,
              },
              true,
            )
            .catch((error) => {
              this.logger.warn(`Auto-search MBID failed for track "${metadata.title}": ${error.message}`);
            });
        }

        await this.libraryStats.updateStats(album.id, artist.id);

        result = 'added';
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ Error procesando ${filePath}:`, error);

      await this.logService.error(
        LogCategory.SCANNER,
        `Error procesando archivo de música`,
        {
          details: JSON.stringify({
            filePath,
            fileExtension: path.extname(filePath),
            errorMessage: (error as Error).message,
          }),
        },
        error as Error,
      );

      return 'skipped';
    }
  }

  /**
   * Check if file should be skipped (incremental scan)
   */
  private async shouldSkipFile(filePath: string, lastScanTime: Date): Promise<boolean> {
    const stats = await this.fileScanner.getFileStats(filePath);
    if (!stats) return false;

    const fileMtime = stats.mtime;

    // If file wasn't modified since last scan...
    if (fileMtime <= lastScanTime) {
      // Check if track exists in DB
      const existingTrack = await this.drizzle.db
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.path, filePath))
        .limit(1);

      // If exists and not changed, skip
      if (existingTrack.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clean up an album if it has no more tracks (orphaned)
   * Also cleans up the artist if they have no more albums
   *
   * This is called when a track changes album (metadata correction)
   * to avoid leaving empty albums in the database.
   */
  private async cleanupOrphanedAlbum(albumId: string): Promise<void> {
    try {
      // Check if album has any remaining tracks
      const remainingTracks = await this.drizzle.db
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.albumId, albumId))
        .limit(1);

      if (remainingTracks.length > 0) {
        // Album still has tracks, nothing to clean up
        return;
      }

      // Get artist ID before deleting album
      const album = await this.drizzle.db
        .select({ id: albums.id, name: albums.name, artistId: albums.artistId })
        .from(albums)
        .where(eq(albums.id, albumId))
        .limit(1);

      if (!album[0]) {
        return;
      }

      const artistId = album[0].artistId;

      // Delete orphaned album
      await this.drizzle.db.delete(albums).where(eq(albums.id, albumId));
      this.logger.info(`🗑️  Álbum huérfano eliminado: "${album[0].name}"`);

      // Check if artist has any remaining albums
      if (artistId) {
        const remainingAlbums = await this.drizzle.db
          .select({ id: albums.id })
          .from(albums)
          .where(eq(albums.artistId, artistId))
          .limit(1);

        if (remainingAlbums.length === 0) {
          // Get artist name for logging
          const artist = await this.drizzle.db
            .select({ name: artists.name })
            .from(artists)
            .where(eq(artists.id, artistId))
            .limit(1);

          // Delete orphaned artist
          await this.drizzle.db.delete(artists).where(eq(artists.id, artistId));
          this.logger.info(`🗑️  Artista huérfano eliminado: "${artist[0]?.name}"`);
        }
      }
    } catch (error) {
      this.logger.error(`Error limpiando álbum huérfano ${albumId}:`, error);
    }
  }
}
