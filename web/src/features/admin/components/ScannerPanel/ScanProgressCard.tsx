import { useTranslation } from 'react-i18next';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Music,
  Disc,
  User,
  Image,
  Film,
  AlertCircle,
} from 'lucide-react';
import { ScanStatus } from '@shared/hooks/useScannerWebSocket';
import styles from './ScannerPanel.module.css';

interface ScanProgressCardProps {
  progress: {
    status: string;
    message?: string;
    progress: number;
    tracksCreated: number;
    albumsCreated: number;
    artistsCreated: number;
    coversExtracted: number;
    videosFound?: number;
    filesScanned: number;
    totalFiles: number;
    errors: number;
    currentFile?: string;
  };
  isConnected: boolean;
  pauseScan: () => void;
  resumeScan: () => void;
  cancelScan: () => void;
}

export function ScanProgressCard({
  progress,
  isConnected,
  pauseScan,
  resumeScan,
  cancelScan,
}: ScanProgressCardProps) {
  const { t } = useTranslation();
  const isPaused = progress.status === ScanStatus.PAUSED;
  const isRunning =
    progress.status === ScanStatus.SCANNING ||
    progress.status === ScanStatus.AGGREGATING ||
    progress.status === ScanStatus.EXTRACTING_COVERS;

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusHeader}>
        {isPaused ? (
          <Pause size={20} className={styles.statusIconPaused} />
        ) : (
          <RefreshCw size={20} className={styles.statusIconRunning} />
        )}
        <div className={styles.statusInfo}>
          <h3 className={styles.statusTitle}>
            {isPaused
              ? t('admin.scanner.scanPaused')
              : progress.message || t('admin.scanner.scanning')}
          </h3>
          <p className={styles.statusDate}>
            {isConnected
              ? `🔌 ${t('admin.scanner.connected')}`
              : `⚠️ ${t('admin.scanner.disconnected')}`}
          </p>
        </div>
        <div className={styles.scanControls}>
          {isRunning && (
            <button
              className={styles.controlButton}
              onClick={pauseScan}
              title={t('admin.scanner.pauseScan')}
            >
              <Pause size={16} />
            </button>
          )}
          {isPaused && (
            <button
              className={`${styles.controlButton} ${styles.controlButtonResume}`}
              onClick={resumeScan}
              title={t('admin.scanner.resumeScan')}
            >
              <Play size={16} />
            </button>
          )}
          {(isRunning || isPaused) && (
            <button
              className={`${styles.controlButton} ${styles.controlButtonCancel}`}
              onClick={() => cancelScan()}
              title={t('admin.scanner.cancelScan')}
            >
              <Square size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress.progress}%` }} />
        <span className={styles.progressText}>{progress.progress}%</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <Music size={16} className={styles.statIcon} />
          <span className={styles.statValue}>{progress.tracksCreated}</span>
          <span className={styles.statLabel}>{t('admin.scanner.tracks')}</span>
        </div>
        <div className={styles.statItem}>
          <Disc size={16} className={styles.statIcon} />
          <span className={styles.statValue}>{progress.albumsCreated}</span>
          <span className={styles.statLabel}>{t('admin.scanner.albums')}</span>
        </div>
        <div className={styles.statItem}>
          <User size={16} className={styles.statIcon} />
          <span className={styles.statValue}>{progress.artistsCreated}</span>
          <span className={styles.statLabel}>{t('admin.scanner.artists')}</span>
        </div>
        <div className={styles.statItem}>
          <Image size={16} className={styles.statIcon} />
          <span className={styles.statValue}>{progress.coversExtracted}</span>
          <span className={styles.statLabel}>{t('admin.scanner.covers')}</span>
        </div>
        {(progress.videosFound ?? 0) > 0 && (
          <div className={styles.statItem}>
            <Film size={16} className={styles.statIcon} />
            <span className={styles.statValue}>{progress.videosFound}</span>
            <span className={styles.statLabel}>Videos</span>
          </div>
        )}
      </div>

      <div className={styles.fileCounter}>
        <span>
          {t('admin.scanner.filesProcessed', {
            scanned: progress.filesScanned,
            total: progress.totalFiles,
          })}
        </span>
        {progress.errors > 0 && (
          <span className={styles.errorCount}>
            <AlertCircle size={14} /> {t('admin.scanner.errors', { count: progress.errors })}
          </span>
        )}
      </div>

      {progress.currentFile && (
        <div className={styles.currentFile}>
          <span className={styles.currentFileLabel}>{t('admin.scanner.processing')}</span>
          <span className={styles.currentFileName}>
            {progress.currentFile.split(/[/\\]/).pop()}
          </span>
        </div>
      )}
    </div>
  );
}
