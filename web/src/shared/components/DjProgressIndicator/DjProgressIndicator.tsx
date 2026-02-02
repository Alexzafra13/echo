import { Music } from 'lucide-react';
import { useAuthStore } from '@shared/store';
import { useDjProgress } from '@shared/hooks/useDjProgress';
import styles from './DjProgressIndicator.module.css';

/**
 * DjProgressIndicator Component
 * Indicador global de progreso de análisis DJ (BPM, Key, Energy)
 * Solo visible cuando hay un análisis en curso
 */
export function DjProgressIndicator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { djProgress } = useDjProgress(accessToken);

  // Solo mostrar si hay análisis activo
  const isActive = djProgress && (djProgress.isRunning || djProgress.pendingTracks > 0);

  if (!isActive) {
    return null;
  }

  const total = djProgress.processedInSession + djProgress.pendingTracks;
  const percentage = total > 0
    ? Math.round((djProgress.processedInSession / total) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <Music
        size={14}
        className={djProgress.isRunning ? styles.iconRunning : styles.icon}
      />
      <span className={styles.text}>
        DJ: {djProgress.processedInSession}/{total}
        <span className={styles.percent}>({percentage}%)</span>
      </span>
      {djProgress.estimatedTimeRemaining && (
        <span className={styles.eta}>~{djProgress.estimatedTimeRemaining}</span>
      )}
      {djProgress.isRunning && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
