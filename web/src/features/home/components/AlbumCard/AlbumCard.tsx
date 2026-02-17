import React, { useCallback } from 'react';
import { Play } from 'lucide-react';
import type { AlbumCardProps } from '../../types';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import styles from './AlbumCard.module.css';

export const AlbumCard = React.memo(function AlbumCard({
  cover,
  title,
  artist,
  onClick,
  onPlayClick,
}: AlbumCardProps) {
  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayClick?.();
  }, [onPlayClick]);

  return (
    <article className={styles.albumCard} onClick={onClick}>
      <div className={styles.albumCard__coverContainer}>
        <img
          src={getCoverUrl(cover)}
          alt={title}
          loading="lazy"
          className={styles.albumCard__cover}
          onError={handleImageError}
        />
        <div className={styles.albumCard__overlay}>
          <button
            className={styles.albumCard__playButton}
            onClick={handlePlayClick}
            aria-label={`Play ${title}`}
          >
            <Play size={20} fill="currentColor" />
          </button>
        </div>
      </div>
      <h3 className={styles.albumCard__title}>{title}</h3>
      <p className={styles.albumCard__artist}>{artist}</p>
    </article>
  );
});
