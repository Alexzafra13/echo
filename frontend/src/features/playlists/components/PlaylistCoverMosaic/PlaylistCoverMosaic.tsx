import { Music } from 'lucide-react';
import styles from './PlaylistCoverMosaic.module.css';

interface PlaylistCoverMosaicProps {
  /** Array of unique album IDs in the playlist */
  albumIds: string[];
  /** Playlist name for alt text */
  playlistName: string;
}

/**
 * PlaylistCoverMosaic Component
 * Displays a mosaic of up to 4 album covers from the playlist, like Spotify
 */
export function PlaylistCoverMosaic({ albumIds, playlistName }: PlaylistCoverMosaicProps) {
  // Get unique album IDs and take only first 4
  const uniqueAlbumIds = Array.from(new Set(albumIds)).filter(id => id).slice(0, 4);

  // If no albums, show placeholder
  if (uniqueAlbumIds.length === 0) {
    return (
      <div className={styles.mosaic}>
        <div className={styles.mosaic__placeholder}>
          <Music size={48} />
        </div>
      </div>
    );
  }

  // If only 1 album, show single cover
  if (uniqueAlbumIds.length === 1) {
    return (
      <div className={styles.mosaic}>
        <img
          src={`/api/albums/${uniqueAlbumIds[0]}/cover`}
          alt={playlistName}
          className={styles.mosaic__single}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = `
              <div class="${styles.mosaic__placeholder}">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </div>
            `;
          }}
        />
      </div>
    );
  }

  // For 2, 3, or 4 albums, show grid
  return (
    <div className={styles.mosaic}>
      <div className={`${styles.mosaic__grid} ${styles[`mosaic__grid_${uniqueAlbumIds.length}`]}`}>
        {uniqueAlbumIds.map((albumId, index) => (
          <div key={albumId} className={styles.mosaic__gridItem}>
            <img
              src={`/api/albums/${albumId}/cover`}
              alt={`${playlistName} - Album ${index + 1}`}
              className={styles.mosaic__gridImage}
              onError={(e) => {
                e.currentTarget.src = '/placeholder-album.png';
              }}
            />
          </div>
        ))}
        {/* Fill remaining slots with placeholder for 2 or 3 albums */}
        {uniqueAlbumIds.length < 4 && Array.from({ length: 4 - uniqueAlbumIds.length }).map((_, index) => (
          <div key={`placeholder-${index}`} className={styles.mosaic__gridItem}>
            <div className={styles.mosaic__gridPlaceholder}>
              <Music size={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
