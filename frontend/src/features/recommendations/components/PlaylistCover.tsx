import { useState } from 'react';
import { Waves } from 'lucide-react';
import styles from './PlaylistCover.module.css';

interface PlaylistCoverProps {
  type: 'wave-mix' | 'artist' | 'genre' | 'mood';
  name: string;
  coverColor?: string;
  coverImageUrl?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
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
  size = 'medium',
  className = '',
}: PlaylistCoverProps) {
  const [imageError, setImageError] = useState(false);

  const showImage = coverImageUrl && !imageError && type === 'artist';
  const backgroundColor = coverColor || '#6C5CE7';

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
        </div>
      ) : (
        <div
          className={styles.colorCover}
          style={{ backgroundColor }}
        >
          <div className={styles.iconContainer}>
            <Waves size={size === 'large' ? 80 : size === 'medium' ? 48 : 32} />
          </div>
          {type === 'wave-mix' && (
            <div className={styles.coverText}>
              Recomendaciones<br />Diarias
            </div>
          )}
        </div>
      )}
    </div>
  );
}
