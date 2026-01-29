import { HardDrive, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useGlobalScanProgress } from '@shared/hooks/useGlobalScanProgress';
import styles from './ScanProgressIndicator.module.css';

/**
 * ScanProgressIndicator Component
 * Shows library scan progress in the header
 * Only visible when there are active scans
 */
export function ScanProgressIndicator() {
  const { scans, hasScans } = useGlobalScanProgress();

  if (!hasScans) {
    return null;
  }

  // Get the most recent/active scan to display
  const currentScan = scans[0];
  if (!currentScan) return null;

  const { status, progress, filesScanned, totalFiles, tracksCreated } =
    currentScan;

  const isActive = status !== 'completed' && status !== 'failed';
  const statusClass = isActive ? 'scanning' : status;

  // Determine icon based on status
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className={styles.iconCompleted} />;
      case 'failed':
        return <XCircle size={14} className={styles.iconFailed} />;
      default:
        return <Loader2 size={14} className={styles.iconScanning} />;
    }
  };

  // Format file count
  const fileCount =
    totalFiles > 0 ? `${filesScanned}/${totalFiles}` : `${filesScanned}`;

  return (
    <div
      className={`${styles.container} ${styles[`container--${statusClass}`]}`}
      title={`Escaneando biblioteca: ${filesScanned} archivos procesados, ${tracksCreated} tracks creados`}
    >
      <div
        className={`${styles.iconWrapper} ${styles[`iconWrapper--${statusClass}`]}`}
      >
        {getIcon()}
      </div>

      <div className={styles.content}>
        <span className={styles.title}>
          <HardDrive size={10} className={styles.titleIcon} />
          Escaneo
        </span>
        <div className={styles.progressRow}>
          {isActive && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <span className={styles.status}>
            {status === 'completed'
              ? 'Listo'
              : status === 'failed'
                ? 'Error'
                : `${fileCount}`}
          </span>
        </div>
      </div>

      {scans.length > 1 && (
        <span className={styles.badge}>+{scans.length - 1}</span>
      )}
    </div>
  );
}
