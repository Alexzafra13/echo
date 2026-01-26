import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { Shuffle, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { ActionCard } from '../ActionCard';
import { useShufflePlay } from '@shared/hooks';
import { useRandomAlbums } from '@features/explore/hooks';
import { useAutoPlaylists } from '@features/home/hooks';
import styles from './ActionCardsRow.module.css';

export interface ActionCardsRowProps {
  /** Additional CSS class */
  className?: string;
}

/**
 * ActionCardsRow Component
 * A row of 3 action cards: Shuffle, Daily Recommendations, Social
 * Responsive layout that adapts to all screen sizes consistently
 */
export function ActionCardsRow({ className }: ActionCardsRowProps) {
  const [, setLocation] = useLocation();
  const { shufflePlay, isLoading: shuffleLoading } = useShufflePlay();

  // Get random albums for background cover decoration
  const { data: randomAlbumsData } = useRandomAlbums(3);

  // Get auto playlists for Wave Mix cover decoration
  const { data: autoPlaylists } = useAutoPlaylists();

  // Pick a random album cover for the shuffle button
  const shuffleCoverUrl = useMemo(() => {
    const albums = randomAlbumsData?.albums || [];
    if (albums.length === 0) return undefined;
    const randomAlbum = albums[Math.floor(Math.random() * albums.length)];
    return randomAlbum?.id ? `/api/albums/${randomAlbum.id}/cover` : undefined;
  }, [randomAlbumsData]);

  // Pick a random album cover from Wave Mix tracks
  const waveMixCoverUrl = useMemo(() => {
    if (!autoPlaylists || autoPlaylists.length === 0) return undefined;
    // Collect unique album IDs from all playlists
    const albumIds = new Set<string>();
    for (const playlist of autoPlaylists) {
      for (const scoredTrack of playlist.tracks || []) {
        if (scoredTrack.track?.albumId) {
          albumIds.add(scoredTrack.track.albumId);
        }
      }
    }
    const albumIdArray = Array.from(albumIds);
    if (albumIdArray.length === 0) return undefined;
    const randomAlbumId = albumIdArray[Math.floor(Math.random() * albumIdArray.length)];
    return `/api/albums/${randomAlbumId}/cover`;
  }, [autoPlaylists]);

  const handleDaily = () => {
    setLocation('/daily');
  };

  const handleTrending = () => {
    setLocation('/trending');
  };

  return (
    <div className={`${styles.actionCardsRow} ${className || ''}`}>
      {/* Shuffle / Random Play */}
      <ActionCard
        icon={<Shuffle size={22} />}
        loadingIcon={<RefreshCw size={22} className={styles.spinning} />}
        title="Aleatorio"
        loadingTitle="Cargando..."
        onClick={shufflePlay}
        isLoading={shuffleLoading}
        customGradient={['#1a1a2e', '#16213e']}
        backgroundCoverUrl={shuffleCoverUrl}
      />

      {/* Wave Mix - Daily Recommendations */}
      <ActionCard
        icon={<Calendar size={22} />}
        title="Wavemix"
        onClick={handleDaily}
        customGradient={['#2d1f3d', '#1a1a2e']}
        backgroundCoverUrl={waveMixCoverUrl}
      />

      {/* Trending - Top 50 most played tracks */}
      <ActionCard
        icon={<TrendingUp size={22} />}
        title="Tendencias"
        loadingTitle="Cargando..."
        onClick={handleTrending}
        customGradient={['#1f2d3d', '#1a2a1a']}
      />
    </div>
  );
}

export default ActionCardsRow;
