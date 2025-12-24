import { useState } from 'react';
import { Music } from 'lucide-react';
import styles from './PlaylistCoverMosaic.module.css';

interface PlaylistCoverMosaicProps {
  /** Array of unique album IDs in the playlist */
  albumIds: string[];
  /** Playlist name for alt text */
  playlistName: string;
}

/**
 * SingleCoverImage - Image component with fallback placeholder
 * Avoids innerHTML to prevent XSS vulnerabilities
 */
function SingleCoverImage({ albumId, playlistName }: { albumId: string; playlistName: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={styles.mosaic__placeholder}>
        <Music size={48} />
      </div>
    );
  }

  return (
    <img
      src={`/api/albums/${albumId}/cover`}
      alt={playlistName}
      className={styles.mosaic__single}
      onError={() => setHasError(true)}
    />
  );
}

/**
 * GridCoverImage - Grid image component with fallback placeholder
 */
function GridCoverImage({ albumId, alt }: { albumId: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={styles.mosaic__gridPlaceholder}>
        <Music size={24} />
      </div>
    );
  }

  return (
    <img
      src={`/api/albums/${albumId}/cover`}
      alt={alt}
      className={styles.mosaic__gridImage}
      onError={() => setHasError(true)}
    />
  );
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
        <SingleCoverImage albumId={uniqueAlbumIds[0]} playlistName={playlistName} />
      </div>
    );
  }

  // For 2, 3, or 4 albums, show grid
  // Determine the grid class based on count
  const gridClass = uniqueAlbumIds.length >= 4 ? 'mosaic__grid_4' : `mosaic__grid_${uniqueAlbumIds.length}`;

  return (
    <div className={styles.mosaic}>
      <div className={`${styles.mosaic__grid} ${styles[gridClass]}`}>
        {uniqueAlbumIds.map((albumId, index) => (
          <div key={albumId} className={styles.mosaic__gridItem}>
            <GridCoverImage
              albumId={albumId}
              alt={`${playlistName} - Album ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
