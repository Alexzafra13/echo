/**
 * Album entity type
 * Represents a music album with all its metadata
 */
export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverImage: string;           // URL de la portada (200x200)
  backgroundImage?: string;      // URL del background (para hero)
  albumArt?: string;             // URL del arte lateral (opcional)
  year: number;
  totalTracks: number;
  duration?: number;             // Duración total en segundos
  genres?: string[];
  addedAt: Date;
}

/**
 * Props for AlbumCard component
 */
export interface AlbumCardProps {
  cover: string;
  title: string;
  artist: string;
  onClick?: () => void;
  onPlayClick?: () => void;
}

/**
 * Props for AlbumGrid component
 */
export interface AlbumGridProps {
  title: string;
  albums: Album[];
}

/**
 * Props for HeroSection component
 */
export interface HeroSectionProps {
  album: Album;
  onPlay?: () => void;
}

/**
 * Hero album data with playback state
 */
export interface HeroAlbumData {
  album: Album;
  isPlaying?: boolean;
}
