import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { genres, trackGenres } from '@infrastructure/database/schema';

/**
 * Service for managing track genres
 * Creates genre entries and associates them with tracks
 */
@Injectable()
export class TrackGenreService {
  constructor(
    private readonly drizzle: DrizzleService,
    @InjectPinoLogger(TrackGenreService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Process and save genres from audio file tags
   * Creates genre entries if they don't exist and associates them with the track
   *
   * @param trackId - Track ID to associate genres with
   * @param genreTags - Array of genre names from audio metadata
   */
  async saveTrackGenres(trackId: string, genreTags?: string[]): Promise<void> {
    if (!genreTags || genreTags.length === 0) {
      return;
    }

    try {
      // Normalize genre names (trim, capitalize, remove duplicates)
      const normalizedGenres = [...new Set(
        genreTags
          .map((g) => g.trim())
          .filter((g) => g.length > 0 && g.length <= 100)
          .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
      )];

      if (normalizedGenres.length === 0) {
        return;
      }

      // Upsert genres (create if not exist)
      const genreRecords = await Promise.all(
        normalizedGenres.map(async (genreName) => {
          return this.findOrCreateGenre(genreName);
        }),
      );

      // Associate genres with track
      await Promise.all(
        genreRecords
          .filter((genre) => genre != null)
          .map(async (genre) => {
            try {
              await this.drizzle.db
                .insert(trackGenres)
                .values({
                  trackId,
                  genreId: genre.id,
                })
                .onConflictDoNothing();
            } catch (error) {
              this.logger.warn(
                `Failed to associate genre ${genre.name} with track: ${(error as Error).message}`,
              );
            }
          }),
      );

      this.logger.debug(`Saved ${genreRecords.length} genres for track ${trackId}`);
    } catch (error) {
      this.logger.error(`Error saving track genres: ${(error as Error).message}`);
      // Don't throw - genre saving shouldn't block track processing
    }
  }

  /**
   * Find or create a genre by name
   */
  private async findOrCreateGenre(genreName: string): Promise<{ id: string; name: string }> {
    // Try to find existing genre
    const existing = await this.drizzle.db
      .select({ id: genres.id, name: genres.name })
      .from(genres)
      .where(eq(genres.name, genreName))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    // Create new genre
    const newGenre = await this.drizzle.db
      .insert(genres)
      .values({ name: genreName })
      .onConflictDoNothing({ target: genres.name })
      .returning({ id: genres.id, name: genres.name });

    // If insert was ignored due to conflict, fetch existing
    if (!newGenre[0]) {
      const fetched = await this.drizzle.db
        .select({ id: genres.id, name: genres.name })
        .from(genres)
        .where(eq(genres.name, genreName))
        .limit(1);
      return fetched[0];
    }

    return newGenre[0];
  }
}
