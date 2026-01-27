import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Music } from 'lucide-react';
import type { ListeningNow } from '../../../services/public-profiles.service';
import styles from '../PublicProfilePage.module.css';

interface ListeningNowBadgeProps {
  listeningNow: ListeningNow | null;
}

export function ListeningNowBadge({ listeningNow }: ListeningNowBadgeProps) {
  const [displayData, setDisplayData] = useState<ListeningNow | null>(listeningNow);
  const [isVisible, setIsVisible] = useState(!!listeningNow);

  useEffect(() => {
    if (listeningNow) {
      // New data: show immediately
      setDisplayData(listeningNow);
      setIsVisible(true);
    } else if (displayData) {
      // Data removed: fade out first, then remove
      setIsVisible(false);
      const timer = setTimeout(() => setDisplayData(null), 500);
      return () => clearTimeout(timer);
    }
  }, [listeningNow]);

  if (!displayData) return null;

  const className = `${styles.publicProfilePage__listeningNow} ${
    isVisible ? styles['publicProfilePage__listeningNow--visible'] : styles['publicProfilePage__listeningNow--hidden']
  }`;

  return (
    <Link
      href={displayData.albumId ? `/album/${displayData.albumId}` : '#'}
      className={className}
    >
      {displayData.coverUrl ? (
        <img
          src={displayData.coverUrl}
          alt={displayData.trackTitle}
          className={styles.publicProfilePage__listeningNowCover}
        />
      ) : (
        <div className={styles.publicProfilePage__listeningNowCoverPlaceholder}>
          <Music size={20} />
        </div>
      )}
      <div className={styles.publicProfilePage__listeningNowInfo}>
        <span className={styles.publicProfilePage__listeningNowLabel}>
          Escuchando ahora
        </span>
        <span className={styles.publicProfilePage__listeningNowTrack}>
          {displayData.trackTitle}
        </span>
        {displayData.artistName && (
          <span className={styles.publicProfilePage__listeningNowArtist}>
            {displayData.artistName}
          </span>
        )}
      </div>
      <div className={styles.publicProfilePage__listeningNowBars}>
        <span className={styles.publicProfilePage__listeningNowBar} />
        <span className={styles.publicProfilePage__listeningNowBar} />
        <span className={styles.publicProfilePage__listeningNowBar} />
        <span className={styles.publicProfilePage__listeningNowBar} />
      </div>
    </Link>
  );
}
