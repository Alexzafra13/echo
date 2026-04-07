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

// Paleta amplia de colores por género
const GENRE_COLORS: Record<string, string> = {
  // Rock
  'Rock': '#DC2626',
  'Alternative': '#B91C1C',
  'Alternative Rock': '#991B1B',
  'Indie': '#EA580C',
  'Indie Rock': '#C2410C',
  'Indie Pop': '#F59E0B',
  'Metal': '#1F2937',
  'Heavy Metal': '#111827',
  'Death Metal': '#0F172A',
  'Black Metal': '#0C0A09',
  'Thrash Metal': '#450A0A',
  'Metalcore': '#7F1D1D',
  'Nu Metal': '#78350F',
  'Progressive Metal': '#3B0764',
  'Progressive Rock': '#581C87',
  'Punk': '#DB2777',
  'Punk Rock': '#BE185D',
  'Pop Punk': '#EC4899',
  'Post-Punk': '#831843',
  'Hardcore': '#7C2D12',
  'Post-Rock': '#6D28D9',
  'Grunge': '#57534E',
  'Emo': '#BE123C',
  'Stoner Rock': '#854D0E',
  'Garage Rock': '#A16207',
  'Psychedelic': '#7C3AED',
  'Shoegaze': '#8B5CF6',
  'Noise': '#44403C',
  // Pop
  'Pop': '#EC4899',
  'Synthpop': '#A855F7',
  'Electropop': '#D946EF',
  'Dream Pop': '#C084FC',
  'Art Pop': '#E879F9',
  'K-Pop': '#F472B6',
  'J-Pop': '#FB7185',
  'Britpop': '#0EA5E9',
  'Power Pop': '#F43F5E',
  'Teen Pop': '#FB923C',
  'Bubblegum Pop': '#F9A8D4',
  // Electronic
  'Electronic': '#06B6D4',
  'Dance': '#E91E63',
  'EDM': '#2563EB',
  'House': '#0891B2',
  'Deep House': '#0E7490',
  'Tech House': '#155E75',
  'Techno': '#1E3A5F',
  'Trance': '#4F46E5',
  'Dubstep': '#7C3AED',
  'Drum and Bass': '#0D9488',
  'Ambient': '#5B21B6',
  'Chillout': '#0EA5E9',
  'Downtempo': '#6366F1',
  'IDM': '#4338CA',
  'Synthwave': '#BE185D',
  'Retrowave': '#9D174D',
  'Vaporwave': '#D946EF',
  'Hardstyle': '#1D4ED8',
  'Trap': '#7C3AED',
  'Future Bass': '#2DD4BF',
  'Lo-fi': '#78716C',
  'Chillwave': '#67E8F9',
  'Glitch': '#A3E635',
  // Hip-hop / Rap
  'Hip hop': '#F59E0B',
  'Hip-Hop': '#F59E0B',
  'Rap': '#D97706',
  'Trap Rap': '#B45309',
  'Boom Bap': '#92400E',
  'Gangsta Rap': '#78350F',
  'Conscious Hip Hop': '#65A30D',
  'Cloud Rap': '#A78BFA',
  'Drill': '#374151',
  'Grime': '#4B5563',
  // R&B / Soul
  'R&b': '#8B5CF6',
  'R&B': '#8B5CF6',
  'Soul': '#CA6F1E',
  'Neo Soul': '#A16207',
  'Funk': '#F59E0B',
  'Motown': '#B45309',
  'Gospel': '#FCD34D',
  'Disco': '#F472B6',
  // Jazz
  'Jazz': '#B45309',
  'Smooth Jazz': '#D97706',
  'Bebop': '#92400E',
  'Swing': '#78350F',
  'Bossa Nova': '#059669',
  'Fusion': '#0D9488',
  'Free Jazz': '#713F12',
  // Blues
  'Blues': '#1E40AF',
  'Delta Blues': '#1E3A8A',
  'Chicago Blues': '#172554',
  // Latin
  'Reggaeton': '#10B981',
  'Latin': '#059669',
  'Latin Pop': '#34D399',
  'Salsa': '#EF4444',
  'Bachata': '#F87171',
  'Cumbia': '#FB923C',
  'Merengue': '#FBBF24',
  'Tango': '#B91C1C',
  'Flamenco': '#DC2626',
  'Bossa': '#047857',
  'Samba': '#16A34A',
  'Latin Rock': '#65A30D',
  'Urbano': '#0D9488',
  'Dembow': '#14B8A6',
  // Country / Folk
  'Country': '#B45309',
  'Folk': '#15803D',
  'Bluegrass': '#4D7C0F',
  'Americana': '#92400E',
  'Celtic': '#065F46',
  'World': '#0F766E',
  'Singer-Songwriter': '#78716C',
  // Reggae / Ska
  'Reggae': '#15803D',
  'Ska': '#4ADE80',
  'Dub': '#166534',
  'Dancehall': '#22C55E',
  // Classical
  'Classical': '#7E22CE',
  'Opera': '#6B21A8',
  'Baroque': '#581C87',
  'Romantic': '#D946EF',
  'Orchestral': '#4C1D95',
  'Chamber Music': '#5B21B6',
  'Contemporary Classical': '#6D28D9',
  // Otros
  'Acoustic': '#A3A3A3',
  'Instrumental': '#737373',
  'Soundtrack': '#475569',
  'Film Score': '#334155',
  'Video Game': '#4F46E5',
  'Anime': '#F43F5E',
  'New Age': '#2DD4BF',
  'Meditation': '#5EEAD4',
  'Experimental': '#A3E635',
  'Noise Rock': '#525252',
  'Industrial': '#404040',
  'EBM': '#262626',
  'Darkwave': '#581C87',
  'Gothic': '#312E81',
  'Post-Hardcore': '#9F1239',
  'Screamo': '#881337',
  'Mathrock': '#0369A1',
  'Midwest Emo': '#E11D48',
  'Ska Punk': '#65A30D',
  'Surf Rock': '#0891B2',
  'Rockabilly': '#B91C1C',
  'Swing Revival': '#D97706',
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

    // Fallback: generar color HSL único basado en el nombre
    // Distribuye los colores por todo el espectro para evitar repeticiones
    let hash = 0;
    for (let i = 0; i < genreName.length; i++) {
      hash = genreName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 55 + (Math.abs(hash >> 8) % 25); // 55-80%
    const lightness = 35 + (Math.abs(hash >> 16) % 15);  // 35-50%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
