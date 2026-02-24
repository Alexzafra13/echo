import { useState } from 'react';
import { Music } from 'lucide-react';
import styles from './PlaylistCoverMosaic.module.css';

interface PlaylistCoverMosaicProps {
  albumIds: string[];
  playlistName: string;
}

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
      loading="lazy"
      decoding="async"
    />
  );
}

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
      loading="lazy"
      decoding="async"
    />
  );
}

export function PlaylistCoverMosaic({ albumIds, playlistName }: PlaylistCoverMosaicProps) {
  const uniqueAlbumIds = Array.from(new Set(albumIds)).filter(id => id).slice(0, 4);

  if (uniqueAlbumIds.length === 0) {
    return (
      <div className={styles.mosaic}>
        <div className={styles.mosaic__placeholder}>
          <Music size={48} />
        </div>
      </div>
    );
  }

  if (uniqueAlbumIds.length === 1) {
    return (
      <div className={styles.mosaic}>
        <SingleCoverImage albumId={uniqueAlbumIds[0]} playlistName={playlistName} />
      </div>
    );
  }

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
