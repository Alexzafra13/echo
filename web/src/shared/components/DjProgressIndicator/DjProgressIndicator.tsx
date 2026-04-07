import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Music2, CheckCircle, Loader2, RotateCcw, Square, AlertTriangle } from 'lucide-react';
import { useDjProgressStore } from '@shared/store';
import { useClickOutside } from '@shared/hooks';
import { apiClient } from '@shared/services/api';
import styles from './DjProgressIndicator.module.css';

export function DjProgressIndicator() {
  const { t } = useTranslation();
  const progress = useDjProgressStore((state) => state.progress);
  const clear = useDjProgressStore((state) => state.clear);
  const [showTooltip, setShowTooltip] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const {
    ref: containerRef,
    isClosing,
    close,
  } = useClickOutside<HTMLDivElement>(() => setShowTooltip(false), {
    enabled: showTooltip,
    animationDuration: 200,
  });

  const handleRetry = useCallback(async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await apiClient.post('/scanner/dj-retry');
    } catch {
      // Silently fail - the UI will update from WebSocket
    } finally {
      setActionPending(false);
    }
  }, [actionPending]);

  const handleStop = useCallback(async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await apiClient.post('/scanner/dj-stop');
      clear();
    } catch {
      // Silently fail
    } finally {
      setActionPending(false);
    }
  }, [actionPending, clear]);

  if (!progress || (!progress.isRunning && progress.pendingTracks === 0)) {
    return null;
  }

  const { isRunning, pendingTracks, processedInSession, estimatedTimeRemaining } = progress;
  const total = pendingTracks + processedInSession;
  const percentage = total > 0 ? Math.round((processedInSession / total) * 100) : 0;

  // Detect stalled state: running with pending tracks but 0 processed for a while
  const isStalled = isRunning && processedInSession === 0 && pendingTracks > 0;

  const handleToggle = () => {
    if (showTooltip) {
      close();
    } else {
      setShowTooltip(true);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={`${styles.indicator} ${isStalled ? styles['indicator--stalled'] : isRunning ? styles['indicator--running'] : styles['indicator--idle']}`}
        onClick={handleToggle}
        type="button"
        aria-label={isRunning ? 'DJ analysis in progress' : 'DJ analysis status'}
      >
        {isStalled ? (
          <AlertTriangle size={14} />
        ) : isRunning ? (
          <Loader2 size={14} className={styles.iconSpinner} />
        ) : (
          <CheckCircle size={14} />
        )}
      </button>

      {showTooltip && (
        <div className={`${styles.tooltip} ${isClosing ? styles['tooltip--closing'] : ''}`}>
          <div className={styles.tooltipHeader}>
            <Music2 size={18} className={styles.headerIcon} />
            <span className={styles.tooltipTitle}>{t('dj.analysisTitle')}</span>
            <span
              className={`${styles.statusBadge} ${isStalled ? styles['statusBadge--stalled'] : isRunning ? styles['statusBadge--running'] : styles['statusBadge--idle']}`}
            >
              {isStalled ? t('dj.stalled') : isRunning ? t('dj.inProgress') : t('dj.completed')}
            </span>
          </div>

          <div className={styles.tooltipContent}>
            {isRunning && (
              <div className={styles.progressSection}>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${isStalled ? styles['progressFill--stalled'] : ''}`}
                    style={{ width: `${Math.max(percentage, isStalled ? 100 : 0)}%` }}
                  />
                </div>
                <span className={styles.progressPercent}>{percentage}%</span>
              </div>
            )}

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{t('dj.processed')}</span>
                <span className={styles.statValue}>{processedInSession.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{t('dj.pending')}</span>
                <span className={styles.statValue}>{pendingTracks.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{t('dj.total')}</span>
                <span className={styles.statValue}>{total.toLocaleString()}</span>
              </div>
              {isRunning && estimatedTimeRemaining && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>{t('dj.timeRemaining')}</span>
                  <span className={styles.statValue}>{estimatedTimeRemaining}</span>
                </div>
              )}
            </div>

            {/* Control buttons */}
            {isRunning && (
              <div className={styles.controls}>
                {isStalled && (
                  <button
                    className={`${styles.controlBtn} ${styles['controlBtn--retry']}`}
                    onClick={handleRetry}
                    disabled={actionPending}
                    title={t('dj.retryTitle')}
                  >
                    <RotateCcw size={14} />
                    {t('dj.retry')}
                  </button>
                )}
                <button
                  className={`${styles.controlBtn} ${styles['controlBtn--stop']}`}
                  onClick={handleStop}
                  disabled={actionPending}
                  title={t('dj.stopTitle')}
                >
                  <Square size={14} />
                  {t('dj.stop')}
                </button>
              </div>
            )}

            <p className={styles.infoText}>
              {isStalled ? t('dj.stalledMessage') : t('dj.analysisMessage')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
