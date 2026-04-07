import { Volume2 } from 'lucide-react';
import { useAuthStore } from '@shared/store';
import { useLufsProgress } from '@shared/hooks/useLufsProgress';
import styles from './LufsProgressIndicator.module.css';

/**
 * LufsProgressIndicator Component
 * Indicador global de progreso de análisis LUFS
 * Solo visible cuando hay un análisis en curso
 */
export function LufsProgressIndicator() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { lufsProgress } = useLufsProgress(accessToken);

  // Solo mostrar si hay análisis activo
  const isActive = lufsProgress && (lufsProgress.isRunning || lufsProgress.pendingTracks > 0);

  if (!isActive) {
    return null;
  }

  const total = lufsProgress.processedInSession + lufsProgress.pendingTracks;
  const percentage = total > 0
    ? Math.round((lufsProgress.processedInSession / total) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <Volume2
        size={14}
        className={lufsProgress.isRunning ? styles.iconRunning : styles.icon}
      />
      <span className={styles.text}>
        LUFS: {lufsProgress.processedInSession}/{total}
        <span className={styles.percent}>({percentage}%)</span>
      </span>
      {lufsProgress.estimatedTimeRemaining && (
        <span className={styles.eta}>~{lufsProgress.estimatedTimeRemaining}</span>
      )}
      {lufsProgress.isRunning && (
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
