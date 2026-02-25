import { useState, useMemo } from 'react';
import { Music } from 'lucide-react';
import styles from './PlaylistCoverMosaic.module.css';

interface PlaylistCoverMosaicProps {
  albumIds: string[];
  playlistName: string;
}

/**
 * Fisher-Yates shuffle with a simple seed-based PRNG.
 * Uses the current minute as part of the seed so covers
 * rotate roughly every minute without flickering on re-renders.
 */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    // Simple LCG PRNG
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = (s >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
  const uniqueAlbumIds = useMemo(() => {
    const unique = Array.from(new Set(albumIds)).filter((id) => id);
    if (unique.length <= 4) return unique;
    // Shuffle using a seed based on playlist name + current minute
    // so covers rotate over time but don't flicker on re-renders
    const minuteSeed = Math.floor(Date.now() / 60000);
    let nameHash = 0;
    for (let i = 0; i < playlistName.length; i++) {
      nameHash = ((nameHash << 5) - nameHash + playlistName.charCodeAt(i)) | 0;
    }
    const shuffled = shuffleWithSeed(unique, nameHash + minuteSeed);
    return shuffled.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumIds.join(','), playlistName]);

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

  const gridClass =
    uniqueAlbumIds.length >= 4 ? 'mosaic__grid_4' : `mosaic__grid_${uniqueAlbumIds.length}`;

  return (
    <div className={styles.mosaic}>
      <div className={`${styles.mosaic__grid} ${styles[gridClass]}`}>
        {uniqueAlbumIds.map((albumId, index) => (
          <div key={albumId} className={styles.mosaic__gridItem}>
            <GridCoverImage albumId={albumId} alt={`${playlistName} - Album ${index + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
