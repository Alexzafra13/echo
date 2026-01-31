import { DjInfoBadge } from '@features/dj/components';
import styles from '../NowPlayingView.module.css';

interface NowPlayingInfoProps {
  title: string;
  artist: string;
  artistId: string | undefined;
  trackId: string | undefined;
  isRadioMode: boolean;
  onGoToArtist: (e: React.MouseEvent, artistId: string) => void;
}

/**
 * NowPlayingInfo - Track title and clickable artist name
 */
export function NowPlayingInfo({
  title,
  artist,
  artistId,
  trackId,
  isRadioMode,
  onGoToArtist,
}: NowPlayingInfoProps) {
  const isArtistClickable = !isRadioMode && !!artistId;

  return (
    <div className={styles.nowPlaying__info}>
      <h1 className={styles.nowPlaying__title}>{title}</h1>
      <p
        className={`${styles.nowPlaying__artist} ${isArtistClickable ? styles['nowPlaying__artist--clickable'] : ''}`}
        onClick={isArtistClickable ? (e) => onGoToArtist(e, artistId!) : undefined}
      >
        {artist}
      </p>
      {!isRadioMode && trackId && (
        <DjInfoBadge trackId={trackId} variant="compact" className={styles.nowPlaying__djBadge} />
      )}
    </div>
  );
}
