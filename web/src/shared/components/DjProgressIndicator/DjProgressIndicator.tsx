import { useState, useCallback } from 'react';
import { Music2, CheckCircle, Loader2, RotateCcw, Square, AlertTriangle } from 'lucide-react';
import { useDjProgressStore } from '@shared/store';
import { useClickOutside } from '@shared/hooks';
import { apiClient } from '@shared/services/api';
import styles from './DjProgressIndicator.module.css';

export function DjProgressIndicator() {
  const progress = useDjProgressStore((state) => state.progress);
  const clear = useDjProgressStore((state) => state.clear);
  const [showTooltip, setShowTooltip] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const { ref: containerRef, isClosing, close } = useClickOutside<HTMLDivElement>(
    () => setShowTooltip(false),
    { enabled: showTooltip, animationDuration: 200 }
  );

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
      <div
        className={`${styles.indicator} ${isStalled ? styles['indicator--stalled'] : isRunning ? styles['indicator--running'] : styles['indicator--idle']}`}
        onClick={handleToggle}
      >
        {isStalled ? (
          <AlertTriangle size={14} />
        ) : isRunning ? (
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
            <span className={`${styles.statusBadge} ${isStalled ? styles['statusBadge--stalled'] : isRunning ? styles['statusBadge--running'] : styles['statusBadge--idle']}`}>
              {isStalled ? 'Atascado' : isRunning ? 'En progreso' : 'Completado'}
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

            {/* Control buttons */}
            {isRunning && (
              <div className={styles.controls}>
                {isStalled && (
                  <button
                    className={`${styles.controlBtn} ${styles['controlBtn--retry']}`}
                    onClick={handleRetry}
                    disabled={actionPending}
                    title="Reintentar análisis fallidos"
                  >
                    <RotateCcw size={14} />
                    Reintentar
                  </button>
                )}
                <button
                  className={`${styles.controlBtn} ${styles['controlBtn--stop']}`}
                  onClick={handleStop}
                  disabled={actionPending}
                  title="Detener análisis"
                >
                  <Square size={14} />
                  Detener
                </button>
              </div>
            )}

            <p className={styles.infoText}>
              {isStalled
                ? 'El análisis parece atascado. Puedes reintentar o detener el proceso.'
                : 'Analizando BPM, tonalidad y energía para mezcla armónica.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
