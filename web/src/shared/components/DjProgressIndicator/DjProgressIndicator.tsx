import { useState } from 'react';
import { Music2, CheckCircle, Loader2 } from 'lucide-react';
import { useDjProgressStore } from '@shared/store';
import { useClickOutside } from '@shared/hooks';
import styles from './DjProgressIndicator.module.css';

export function DjProgressIndicator() {
  const progress = useDjProgressStore((state) => state.progress);
  const [showTooltip, setShowTooltip] = useState(false);

  const { ref: containerRef, isClosing, close } = useClickOutside<HTMLDivElement>(
    () => setShowTooltip(false),
    { enabled: showTooltip, animationDuration: 200 }
  );

  if (!progress || (!progress.isRunning && progress.pendingTracks === 0)) {
    return null;
  }

  const { isRunning, pendingTracks, processedInSession, estimatedTimeRemaining } = progress;
  const total = pendingTracks + processedInSession;
  const percentage = total > 0 ? Math.round((processedInSession / total) * 100) : 0;

  const handleToggle = () => {
    if (showTooltip) {
      close();
    } else {
      setShowTooltip(true);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={`${styles.indicator} ${isRunning ? styles['indicator--running'] : styles['indicator--idle']}`}
        onClick={handleToggle}
      >
        {isRunning ? (
          <Loader2 size={14} className={styles.iconSpinner} />
        ) : (
          <CheckCircle size={14} />
        )}
      </div>

      {showTooltip && (
        <div className={`${styles.tooltip} ${isClosing ? styles['tooltip--closing'] : ''}`}>
          <div className={styles.tooltipHeader}>
            <Music2 size={18} className={styles.headerIcon} />
            <span className={styles.tooltipTitle}>Análisis DJ</span>
            <span className={`${styles.statusBadge} ${isRunning ? styles['statusBadge--running'] : styles['statusBadge--idle']}`}>
              {isRunning ? 'En progreso' : 'Completado'}
            </span>
          </div>

          <div className={styles.tooltipContent}>
            {isRunning && (
              <div className={styles.progressSection}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={styles.progressPercent}>{percentage}%</span>
              </div>
            )}

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Procesados</span>
                <span className={styles.statValue}>{processedInSession.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Pendientes</span>
                <span className={styles.statValue}>{pendingTracks.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total</span>
                <span className={styles.statValue}>{total.toLocaleString()}</span>
              </div>
              {isRunning && estimatedTimeRemaining && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Tiempo restante</span>
                  <span className={styles.statValue}>{estimatedTimeRemaining}</span>
                </div>
              )}
            </div>

            <p className={styles.infoText}>
              Analizando BPM, tonalidad y energía para mezcla armónica.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
