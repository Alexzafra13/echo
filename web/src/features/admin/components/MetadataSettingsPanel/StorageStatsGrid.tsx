import { HardDrive, CheckCircle, AlertCircle, Radio } from 'lucide-react';
import { formatBytes } from '@shared/utils/format';
import styles from './MaintenanceTab.module.css';

export interface StorageStats {
  totalSize: number;
  totalFiles: number;
  artistImages: number;
  albumImages: number;
  radioFavicons: number;
  radioFaviconSize: number;
  orphanedFiles: number;
}

interface StorageStatsGridProps {
  stats: StorageStats;
}

export function StorageStatsGrid({ stats }: StorageStatsGridProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <HardDrive size={24} />
        </div>
        <div className={styles.statContent}>
          <p className={styles.statLabel}>Tamaño Total</p>
          <p className={styles.statValue}>{formatBytes(stats.totalSize)}</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <CheckCircle size={24} />
        </div>
        <div className={styles.statContent}>
          <p className={styles.statLabel}>Archivos Totales</p>
          <p className={styles.statValue}>{stats.totalFiles}</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <CheckCircle size={24} />
        </div>
        <div className={styles.statContent}>
          <p className={styles.statLabel}>Imágenes de Artistas</p>
          <p className={styles.statValue}>{stats.artistImages}</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <CheckCircle size={24} />
        </div>
        <div className={styles.statContent}>
          <p className={styles.statLabel}>Imágenes de Álbumes</p>
          <p className={styles.statValue}>{stats.albumImages}</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Radio size={24} />
        </div>
        <div className={styles.statContent}>
          <p className={styles.statLabel}>Favicons de Radio</p>
          <p className={styles.statValue}>
            {stats.radioFavicons}
            {stats.radioFaviconSize > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginLeft: '0.5rem',
                }}
              >
                ({formatBytes(stats.radioFaviconSize)})
              </span>
            )}
          </p>
        </div>
      </div>

      {stats.orphanedFiles > 0 && (
        <div className={`${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statIcon}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Archivos Huérfanos</p>
            <p className={styles.statValue}>{stats.orphanedFiles}</p>
          </div>
        </div>
      )}
    </div>
  );
}
