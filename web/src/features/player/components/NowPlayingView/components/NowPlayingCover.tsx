import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import styles from '../NowPlayingView.module.css';

interface NowPlayingCoverProps {
  cover: string;
  title: string;
  albumName: string | undefined;
  albumId: string | undefined;
  isRadioMode: boolean;
  onGoToAlbum: (e: React.MouseEvent, albumId: string) => void;
}

/**
 * NowPlayingCover - Album cover with click to navigate
 */
export function NowPlayingCover({
  cover,
  title,
  albumName,
  albumId,
  isRadioMode,
  onGoToAlbum,
}: NowPlayingCoverProps) {
  const isClickable = !isRadioMode && !!albumId;

  return (
    <div
      className={`${styles.nowPlaying__coverContainer} ${isClickable ? styles['nowPlaying__coverContainer--clickable'] : ''}`}
      onClick={isClickable ? (e) => onGoToAlbum(e, albumId!) : undefined}
      title={isClickable ? `Ir al álbum: ${albumName}` : undefined}
    >
      <img
        src={isRadioMode ? cover : getCoverUrl(cover)}
        alt={title}
        className={styles.nowPlaying__cover}
        onError={handleImageError}
      />
    </div>
  );
}
