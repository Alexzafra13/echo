import { useLocation } from 'wouter';
import { AlbumCard } from '../AlbumCard';
import type { AlbumGridProps } from '../../types';
import styles from './AlbumGrid.module.css';

/**
 * AlbumGrid Component
 * Displays a grid of albums with a title
 *
 * @example
 * <AlbumGrid
 *   title="Recently Added"
 *   albums={recentAlbums}
 * />
 */
export function AlbumGrid({ title, albums }: AlbumGridProps) {
  const [, setLocation] = useLocation();

  const handleAlbumClick = (albumId: string) => {
    setLocation(`/album/${albumId}`);
  };

  const handlePlayClick = (albumId: string) => {
    // TODO: Implement play functionality
    console.log('Play album:', albumId);
  };

  if (!albums || albums.length === 0) {
    return null;
  }

  return (
    <section className={styles.albumGrid}>
      <h2 className={styles.albumGrid__title}>{title}</h2>
      <div className={styles.albumGrid__grid}>
        {albums.map((album) => (
          <AlbumCard
            key={album.id}
            cover={album.coverImage}
            title={album.title}
            artist={album.artist}
            onClick={() => handleAlbumClick(album.id)}
            onPlayClick={() => handlePlayClick(album.id)}
          />
        ))}
      </div>
    </section>
  );
}
