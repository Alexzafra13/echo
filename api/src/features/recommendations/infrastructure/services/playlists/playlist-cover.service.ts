import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists } from '@infrastructure/database/schema';

// Pastel colors for Wave Mix covers
const WAVE_MIX_COLORS = [
  '#FF6B9D', // Pink
  '#C44569', // Dark Pink
  '#4834DF', // Blue Purple
  '#6C5CE7', // Purple
  '#00D2D3', // Cyan
  '#1ABC9C', // Turquoise
  '#F39C12', // Orange
  '#E67E22', // Dark Orange
  '#E74C3C', // Red
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#2ECC71', // Green
];

// Genre-specific colors
const GENRE_COLORS: Record<string, string> = {
  // Rock family
  'Rock': '#34495E',
  'Alternative': '#C0392B',
  'Indie': '#E67E22',
  'Metal': '#34495E',
  'Punk': '#8E44AD',
  // Pop family
  'Pop': '#FF6B9D',
  'Synthpop': '#9B59B6',
  'Dance': '#E91E63',
  'Electronic': '#3498DB',
  // Hip-hop family
  'Hip hop': '#95A5A6',
  'Rap': '#7F8C8D',
  'R&b': '#BDC3C7',
  // Jazz/Soul
  'Jazz': '#D35400',
  'Soul': '#CA6F1E',
  'Funk': '#F39C12',
  'Blues': '#2980B9',
  // Latin
  'Reggaeton': '#1ABC9C',
  'Latin': '#16A085',
  'Salsa': '#E74C3C',
  // Other
  'Classical': '#8E44AD',
  'Folk': '#27AE60',
  'Country': '#D68910',
  'Reggae': '#229954',
};

/**
 * Service for managing playlist cover colors and images
 */
@Injectable()
export class PlaylistCoverService {
  constructor(
    private readonly drizzle: DrizzleService,
    @InjectPinoLogger(PlaylistCoverService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Get a consistent random color based on user ID
   */
  getRandomColor(userId: string): string {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return WAVE_MIX_COLORS[hash % WAVE_MIX_COLORS.length];
  }

  /**
   * Get a color for a genre (based on genre name for consistency)
   */
  getGenreColor(genreName: string): string {
    // Try exact match first
    if (GENRE_COLORS[genreName]) {
      return GENRE_COLORS[genreName];
    }

    // Try partial match
    for (const [key, color] of Object.entries(GENRE_COLORS)) {
      if (genreName.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }

    // Fallback: generate color from genre name hash
    const hash = genreName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return WAVE_MIX_COLORS[hash % WAVE_MIX_COLORS.length];
  }

  /**
   * Get artist cover image URL
   * Reuses images already downloaded by the artist page to avoid duplication
   */
  async getArtistCoverImage(artist: { id: string; name: string }): Promise<string> {
    // Check if artist already has an external profile image downloaded
    const artistWithImagesResult = await this.drizzle.db
      .select({
        externalProfilePath: artists.externalProfilePath,
        profileImagePath: artists.profileImagePath,
      })
      .from(artists)
      .where(eq(artists.id, artist.id))
      .limit(1);

    const artistWithImages = artistWithImagesResult[0] || null;

    // If artist has either external or local profile image, use it
    if (artistWithImages?.externalProfilePath || artistWithImages?.profileImagePath) {
      this.logger.debug({ artistId: artist.id, artistName: artist.name }, 'Reusing existing artist profile image');
    } else {
      this.logger.debug({ artistId: artist.id, artistName: artist.name }, 'No artist image found, using profile endpoint');
    }

    // Always return the profile URL - the ImageService handles priority
    return `/api/images/artists/${artist.id}/profile`;
  }
}
