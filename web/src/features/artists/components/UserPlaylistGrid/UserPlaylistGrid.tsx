import { useLocation } from 'wouter';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import type { Playlist } from '@features/playlists/types';
import styles from './UserPlaylistGrid.module.css';

interface UserPlaylistGridProps {
  title: string;
  playlists: Playlist[];
  showViewAll?: boolean;
  viewAllPath?: string;
}

/**
 * UserPlaylistGrid Component
 * Displays a grid of user playlists (regular playlists, not auto-generated)
 * Used in ArtistDetailPage to show playlists containing the artist's tracks
 */
export function UserPlaylistGrid({
  title,
  playlists,
  showViewAll = false,
  viewAllPath = '/playlists',
}: UserPlaylistGridProps) {
  const [, setLocation] = useLocation();

  const handlePlaylistClick = (playlistId: string) => {
    setLocation(`/playlists/${playlistId}`);
  };

  const handleViewAllClick = () => {
    setLocation(viewAllPath);
  };

  if (!playlists || playlists.length === 0) {
    return null;
  }

  return (
    <section className={styles.userPlaylistGrid}>
      <div className={styles.userPlaylistGrid__header}>
        <h2 className={styles.userPlaylistGrid__title}>{title}</h2>
        {showViewAll && (
          <button
            className={styles.userPlaylistGrid__viewAllButton}
            onClick={handleViewAllClick}
          >
            Ver todas →
          </button>
        )}
      </div>
      <div className={styles.userPlaylistGrid__grid}>
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className={styles.playlistCard}
            onClick={() => handlePlaylistClick(playlist.id)}
          >
            <div className={styles.playlistCard__cover}>
              <PlaylistCoverMosaic
                albumIds={playlist.albumIds || []}
                playlistName={playlist.name}
              />
            </div>
            <h3 className={styles.playlistCard__name}>{playlist.name}</h3>
            <p className={styles.playlistCard__meta}>
              {playlist.songCount} {playlist.songCount === 1 ? 'canción' : 'canciones'}
              {playlist.ownerName && (
                <span className={styles.playlistCard__owner}> • {playlist.ownerName}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
