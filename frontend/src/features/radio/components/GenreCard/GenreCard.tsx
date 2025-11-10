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

export function GenreCard({ genre, onClick }: GenreCardProps) {
  return (
    <button
      className={styles.genreCard}
      onClick={() => onClick(genre.id)}
    >
      <span className={styles.genreIcon}>{genre.icon}</span>
      <h3 className={styles.genreName}>{genre.name}</h3>
      <p className={styles.genreCount}>{genre.stationCount} emisoras</p>
    </button>
  );
}
