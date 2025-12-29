import { memo, useCallback } from 'react';
import styles from './GenreCard.module.css';

export interface Genre {
  id: string;
  name: string;
  icon: string;
  stationCount: number;
}

interface GenreCardProps {
  genre: Genre;
  onClick: (genreId: string) => void;
}

/**
 * GenreCard Component
 * Displays a single genre with icon, name and station count
 * Memoized to prevent unnecessary re-renders in lists
 */
export const GenreCard = memo(function GenreCard({ genre, onClick }: GenreCardProps) {
  const handleClick = useCallback(() => {
    onClick(genre.id);
  }, [onClick, genre.id]);

  return (
    <button
      className={styles.genreCard}
      onClick={handleClick}
    >
      <span className={styles.genreIcon}>{genre.icon}</span>
      <h3 className={styles.genreName}>{genre.name}</h3>
      <p className={styles.genreCount}>{genre.stationCount} emisoras</p>
    </button>
  );
});
