import { useLocation } from 'wouter';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import { PlaylistCover } from '@features/recommendations/components/PlaylistCover';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import styles from './PlaylistGrid.module.css';

interface PlaylistGridProps {
  title: string;
  playlists: AutoPlaylist[];
  showViewAll?: boolean;
  viewAllPath?: string;
}

/**
 * PlaylistGrid Component
 * Displays a horizontal grid of auto-generated playlists (Wave Mix, Artist, Genre)
 * Used in HomePage to show daily recommendations
 */
export function PlaylistGrid({
  title,
  playlists,
  showViewAll = false,
  viewAllPath = '/wave-mix'
}: PlaylistGridProps) {
  const [, setLocation] = useLocation();

  const handlePlaylistClick = (playlist: AutoPlaylist) => {
    // Store playlist in sessionStorage for the detail page
    safeSessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    setLocation(`/wave-mix/${playlist.id}`);
  };

  const handleViewAllClick = () => {
    setLocation(viewAllPath);
  };

  if (!playlists || playlists.length === 0) {
    return null;
  }

  return (
    <section className={styles.playlistGrid}>
      <div className={styles.playlistGrid__header}>
        <h2 className={styles.playlistGrid__title}>{title}</h2>
        {showViewAll && (
          <button
            className={styles.playlistGrid__viewAllButton}
            onClick={handleViewAllClick}
          >
            Ver todas →
          </button>
        )}
      </div>
      <div className={styles.playlistGrid__grid}>
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className={styles.playlistCard}
            onClick={() => handlePlaylistClick(playlist)}
          >
            <div className={styles.playlistCard__coverContainer}>
              <PlaylistCover
                type={playlist.type}
                name={playlist.name}
                coverColor={playlist.coverColor}
                coverImageUrl={playlist.coverImageUrl}
                artistName={playlist.metadata.artistName}
                size="medium"
              />
            </div>
            <h3 className={styles.playlistCard__name}>{playlist.name}</h3>
            <p className={styles.playlistCard__description}>
              {playlist.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
