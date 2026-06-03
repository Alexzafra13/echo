import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { genres, trackGenres } from '@infrastructure/database/schema';

// Crea los géneros y los asocia a los tracks
@Injectable()
export class TrackGenreService {
  constructor(
    private readonly drizzle: DrizzleService,
    @InjectPinoLogger(TrackGenreService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Guarda los géneros de los tags: crea los que falten y los asocia al track
  async saveTrackGenres(trackId: string, genreTags?: string[]): Promise<void> {
    if (!genreTags || genreTags.length === 0) {
      return;
    }

    try {
      // Normaliza nombres (trim, capitaliza, sin duplicados)
      const normalizedGenres = [...new Set(
        genreTags
          .map((g) => g.trim())
          .filter((g) => g.length > 0 && g.length <= 100)
          .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
      )];

      if (normalizedGenres.length === 0) {
        return;
      }

      // Crea los géneros que no existan
      const genreRecords = await Promise.all(
        normalizedGenres.map(async (genreName) => {
          return this.findOrCreateGenre(genreName);
        }),
      );

      // Asocia los géneros al track
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
      // No relanza: guardar géneros no debe bloquear el procesado del track
    }
  }

  private async findOrCreateGenre(genreName: string): Promise<{ id: string; name: string }> {
    const existing = await this.drizzle.db
      .select({ id: genres.id, name: genres.name })
      .from(genres)
      .where(eq(genres.name, genreName))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const newGenre = await this.drizzle.db
      .insert(genres)
      .values({ name: genreName })
      .onConflictDoNothing({ target: genres.name })
      .returning({ id: genres.id, name: genres.name });

    // Si el insert se ignoró por conflicto, busca el existente
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
