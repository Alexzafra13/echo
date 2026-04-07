import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { formatDateShort } from '@shared/utils/format';
import { getStatusIcon, getStatusText } from './scannerUtils';
import styles from './ScannerPanel.module.css';

interface LatestScanCardProps {
  scan: {
    status: string;
    startedAt: string;
    tracksAdded?: number;
    tracksUpdated?: number;
    tracksDeleted?: number;
    errorMessage?: string;
  };
}

export function LatestScanCard({ scan }: LatestScanCardProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusHeader}>
        {getStatusIcon(scan.status)}
        <div className={styles.statusInfo}>
          <h3 className={styles.statusTitle}>{getStatusText(scan.status, t)}</h3>
          <p className={styles.statusDate}>{formatDateShort(scan.startedAt)}</p>
        </div>
      </div>

      {scan.status === 'completed' && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{scan.tracksAdded || 0}</span>
            <span className={styles.statLabel}>{t('admin.scanner.added')}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{scan.tracksUpdated || 0}</span>
            <span className={styles.statLabel}>{t('admin.scanner.updated')}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{scan.tracksDeleted || 0}</span>
            <span className={styles.statLabel}>{t('admin.scanner.deleted')}</span>
          </div>
        </div>
      )}

      {scan.errorMessage && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{scan.errorMessage}</span>
        </div>
      )}
    </div>
  );
}
