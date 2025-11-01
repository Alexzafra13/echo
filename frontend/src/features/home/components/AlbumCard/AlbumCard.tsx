import { Play } from 'lucide-react';
import type { AlbumCardProps } from '../../types';
import styles from './AlbumCard.module.css';

/**
 * AlbumCard Component
 * Displays a single album with cover, title, artist and play button on hover
 *
 * @example
 * <AlbumCard
 *   cover="/images/album.jpg"
 *   title="American Idiot"
 *   artist="Green Day"
 *   onClick={() => navigate('/album/123')}
 *   onPlayClick={() => play(albumId)}
 * />
 */
export function AlbumCard({
  cover,
  title,
  artist,
  onClick,
  onPlayClick,
}: AlbumCardProps) {
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayClick?.();
  };

  return (
    <article className={styles.card} onClick={onClick}>
      <div className={styles.coverContainer}>
        <img src={cover} alt={title} loading="lazy" className={styles.cover} />
        <div className={styles.overlay}>
          <button
            className={styles.playButton}
            onClick={handlePlayClick}
            aria-label={`Play ${title}`}
          >
            <Play size={24} />
          </button>
        </div>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.artist}>{artist}</p>
    </article>
  );
}
