import { Music2, CheckCircle } from 'lucide-react';
import { useDjProgressStore } from '@shared/store';
import styles from './DjProgressIndicator.module.css';

/**
 * DjProgressIndicator Component
 * Shows DJ analysis progress (BPM, Key, Energy) in the header
 * Only visible when analysis is running
 */
export function DjProgressIndicator() {
  const progress = useDjProgressStore((state) => state.progress);

  // Don't show if no progress data or not running and no pending
  if (!progress || (!progress.isRunning && progress.pendingTracks === 0)) {
    return null;
  }

  const { isRunning, pendingTracks, processedInSession, estimatedTimeRemaining } = progress;
  const total = pendingTracks + processedInSession;
  const percentage = total > 0 ? Math.round((processedInSession / total) * 100) : 0;

  const statusClass = isRunning ? 'running' : 'idle';

  return (
    <div
      className={`${styles.container} ${styles[`container--${statusClass}`]}`}
      title={`Análisis DJ: ${processedInSession}/${total} tracks${estimatedTimeRemaining ? ` - ${estimatedTimeRemaining} restante` : ''}`}
    >
      <div className={`${styles.iconWrapper} ${!isRunning ? styles['iconWrapper--idle'] : ''}`}>
        {isRunning ? (
          <Music2 size={14} className={styles.iconRunning} />
        ) : (
          <CheckCircle size={14} className={styles.iconIdle} />
        )}
      </div>

      {/* Full content for desktop/tablet */}
      <div className={styles.content}>
        <span className={styles.title}>
          <Music2 size={10} className={styles.titleIcon} />
          DJ Analysis
        </span>
        <div className={styles.progressRow}>
          {isRunning && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
          <span className={styles.status}>
            {isRunning ? `${processedInSession}/${total}` : 'Listo'}
          </span>
          {isRunning && estimatedTimeRemaining && (
            <span className={styles.time}>{estimatedTimeRemaining}</span>
          )}
        </div>
      </div>

      {/* Compact counter for mobile (visible when content is hidden) */}
      <span className={styles.mobileCount}>
        {isRunning ? `${processedInSession}/${total}` : 'OK'}
      </span>
    </div>
  );
}
