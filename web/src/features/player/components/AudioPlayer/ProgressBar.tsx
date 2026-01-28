import { formatDuration } from '@shared/utils/format';
import styles from './AudioPlayer.module.css';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div className={styles.progressContainer}>
      <span className={styles.timeLabel}>{formatDuration(currentTime)}</span>
      <div className={styles.progressBar} onClick={handleProgressClick}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className={styles.progressHandle}
          style={{ left: `${progressPercent}%` }}
        />
      </div>
      <span className={styles.timeLabel}>{formatDuration(duration)}</span>
    </div>
  );
}
