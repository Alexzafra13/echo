import { useLocation } from 'wouter';
import type { SharedAlbum } from '../../types';
import styles from './SharedAlbumGrid.module.css';

interface SharedAlbumGridProps {
  title: string;
  albums: SharedAlbum[];
  showViewAll?: boolean;
  viewAllPath?: string;
  mobileScroll?: boolean;
}

/**
 * SharedAlbumGrid Component
 * Displays a grid of shared albums from connected servers
 */
export function SharedAlbumGrid({
  title,
  albums,
  showViewAll = false,
  viewAllPath = '/shared-libraries',
  mobileScroll = false,
}: SharedAlbumGridProps) {
  const [, setLocation] = useLocation();

  const handleAlbumClick = (album: SharedAlbum) => {
    // Navigate to shared libraries page with server and album pre-selected
    setLocation(`/shared-libraries?server=${album.serverId}&album=${album.id}`);
  };

  const handleViewAllClick = () => {
    setLocation(viewAllPath);
  };

  if (!albums || albums.length === 0) {
    return null;
  }

  return (
    <section className={styles.sharedAlbumGrid}>
      <div className={styles.sharedAlbumGrid__header}>
        <h2 className={styles.sharedAlbumGrid__title}>{title}</h2>
        {showViewAll && (
          <button
            className={styles.sharedAlbumGrid__viewAllButton}
            onClick={handleViewAllClick}
          >
            Ver todos →
          </button>
        )}
      </div>
      <div className={`${styles.sharedAlbumGrid__grid} ${mobileScroll ? styles['sharedAlbumGrid__grid--mobileScroll'] : ''}`}>
        {albums.map((album) => (
          <button
            key={`${album.serverId}-${album.id}`}
            className={styles.sharedAlbumGrid__card}
            onClick={() => handleAlbumClick(album)}
          >
            <div className={styles.sharedAlbumGrid__coverWrapper}>
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt={album.name}
                  className={styles.sharedAlbumGrid__cover}
                  loading="lazy"
                />
              ) : (
                <div className={styles.sharedAlbumGrid__coverPlaceholder}>
                  <span>🎵</span>
                </div>
              )}
              <div className={styles.sharedAlbumGrid__serverBadge}>
                {album.serverName}
              </div>
            </div>
            <div className={styles.sharedAlbumGrid__info}>
              <h3 className={styles.sharedAlbumGrid__albumTitle}>{album.name}</h3>
              <p className={styles.sharedAlbumGrid__artist}>{album.artistName}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
