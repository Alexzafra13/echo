import { useState } from 'react';
import { Waves } from 'lucide-react';
import styles from './PlaylistCover.module.css';

interface PlaylistCoverProps {
  type: 'wave-mix' | 'artist' | 'genre' | 'mood';
  name: string;
  coverColor?: string;
  coverImageUrl?: string;
  artistName?: string; // For artist playlists
  size?: 'small' | 'medium' | 'large' | 'responsive';
  className?: string;
}

/**
 * Genres that have custom overlay images
 * Image files: /images/wave_mix_covers/wave_mix_{genre}.png
 */
const GENRES_WITH_OVERLAY = ['rock'] as const;

/**
 * Get overlay image URL for a genre if it exists
 */
function getGenreOverlayUrl(name: string): string | null {
  // Extract genre name from playlist name (e.g., "Rock Mix" -> "rock")
  const genreName = name.replace(/ Mix$/i, '').toLowerCase();

  if (GENRES_WITH_OVERLAY.includes(genreName as typeof GENRES_WITH_OVERLAY[number])) {
    return `/images/wave_mix_covers/wave_mix_${genreName}.png`;
  }
  return null;
}

/**
 * PlaylistCover Component
 * Displays a playlist cover with either a color background or an artist image
 */
export function PlaylistCover({
  type,
  name,
  coverColor,
  coverImageUrl,
  artistName,
  size = 'medium',
  className = '',
}: PlaylistCoverProps) {
  const [imageError, setImageError] = useState(false);
  const [overlayError, setOverlayError] = useState(false);

  const showImage = coverImageUrl && !imageError && type === 'artist';
  const backgroundColor = coverColor || '#6C5CE7';

  // Check for genre overlay image
  const genreOverlayUrl = type === 'genre' && !overlayError ? getGenreOverlayUrl(name) : null;

  return (
    <div className={`${styles.cover} ${styles[size]} ${className}`}>
      {showImage ? (
        <div className={styles.imageCover}>
          <img
            src={coverImageUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={styles.image}
          />
          <div className={styles.imageOverlay} />
          {artistName && (
            <div className={styles.artistName}>
              {artistName}
            </div>
          )}
        </div>
      ) : (
        <div
          className={styles.colorCover}
          style={{ backgroundColor }}
        >
          {genreOverlayUrl ? (
            // Genre with custom overlay image
            <img
              src={genreOverlayUrl}
              alt={name}
              className={styles.genreOverlay}
              onError={() => setOverlayError(true)}
            />
          ) : (
            // Default: Waves icon
            <>
              <div className={styles.iconContainer}>
                <Waves size={size === 'large' ? 80 : size === 'small' ? 32 : 48} />
              </div>
              {type === 'wave-mix' && (
                <div className={styles.coverText}>
                  Recomendaciones<br />Diarias
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
