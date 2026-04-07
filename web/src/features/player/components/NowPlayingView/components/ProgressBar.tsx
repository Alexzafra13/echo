import { formatDuration } from '@shared/utils/format';
import styles from '../NowPlayingView.module.css';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

/**
 * ProgressBar - Track progress with seek functionality
 */
export function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * duration);
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * duration);
  };

  return (
    <div className={styles.nowPlaying__progress}>
      <div
        className={styles.nowPlaying__progressBar}
        onClick={handleProgressClick}
        onTouchMove={handleProgressTouch}
      >
        <div
          className={styles.nowPlaying__progressFill}
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className={styles.nowPlaying__progressHandle}
          style={{ left: `${progressPercent}%` }}
        />
      </div>
      <div className={styles.nowPlaying__time}>
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
