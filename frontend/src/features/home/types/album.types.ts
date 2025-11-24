/**
 * Album entity type
 * Represents a music album with all its metadata
 */
export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverImage: string;
  backgroundImage?: string;
  albumArt?: string;
  year: number;
  releaseDate?: string;
  totalTracks: number;
  duration?: number;
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
  onNext?: () => void;
  onPrevious?: () => void;
}

/**
 * Hero album data with playback state
 */
export interface HeroAlbumData {
  album: Album;
  isPlaying?: boolean;
}
