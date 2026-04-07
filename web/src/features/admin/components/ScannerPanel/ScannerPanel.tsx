import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, RefreshCw, Library } from 'lucide-react';
import { CollapsibleInfo } from '@shared/components/ui';
import { useScannerHistory, useStartScan } from '../../hooks/useScanner';
import { useScannerWebSocket } from '@shared/hooks/useScannerWebSocket';
import { useAuthStore } from '@shared/store';
import { formatDateShort } from '@shared/utils/format';
import { ScanProgressCard } from './ScanProgressCard';
import { LatestScanCard } from './LatestScanCard';
import { AnalysisProgressBar } from './AnalysisProgressBar';
import { getStatusIcon } from './scannerUtils';
import styles from './ScannerPanel.module.css';

// Re-export sub-components for external use
export { ScanProgressCard, LatestScanCard, AnalysisProgressBar };

/**
 * ScannerPanel Component
 * Panel para gestionar el escaneo de la librería musical
 *
 * Features:
 * - Botón para iniciar escaneo manual
 * - Historial de escaneos anteriores
 * - Estado visual del último escaneo
 */
export function ScannerPanel() {
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const { data: history, isLoading: historyLoading, refetch } = useScannerHistory();
  const { mutate: startScan, isPending: isScanning, data: scanResponse } = useStartScan();
  const accessToken = useAuthStore((s) => s.accessToken);

  // WebSocket para progreso en tiempo real (scan + LUFS + DJ)
  const {
    progress,
    isCompleted,
    isConnected,
    lufsProgress,
    djProgress,
    pauseScan,
    cancelScan,
    resumeScan,
  } = useScannerWebSocket(currentScanId, accessToken);

  // Cuando se inicia un scan, guardar el ID para WebSocket
  useEffect(() => {
    if (scanResponse?.id) {
      setCurrentScanId(scanResponse.id);
    }
  }, [scanResponse]);

  // Cuando el scan se completa, refrescar historial
  useEffect(() => {
    if (isCompleted) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        refetch();
        setCurrentScanId(null);
      }, 2000);
    }
  }, [isCompleted, refetch]);

  const handleStartScan = () => {
    startScan(
      { recursive: true, pruneDeleted: true },
      {
        onSuccess: () => {
          // Refrescar historial después de iniciar
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => refetch(), 1000);
        },
      }
    );
  };

  const latestScan = history?.scans?.[0];

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>
            <Library size={24} className={styles.headerIcon} />
            <h2 className={styles.title}>{t('admin.scanner.title')}</h2>
          </div>
          <p className={styles.description}>{t('admin.scanner.description')}</p>
        </div>
        <button className={styles.scanButton} onClick={handleStartScan} disabled={isScanning}>
          {isScanning ? (
            <>
              <RefreshCw size={16} className={styles.scanButton__spinner} />
              {t('admin.scanner.scanning')}
            </>
          ) : (
            <>
              <Play size={16} />
              {t('admin.scanner.scanNow')}
            </>
          )}
        </button>
      </div>

      {/* Real-time Scan Progress */}
      {progress && currentScanId && (
        <ScanProgressCard
          progress={progress}
          isConnected={isConnected}
          pauseScan={pauseScan}
          resumeScan={resumeScan}
          cancelScan={cancelScan}
        />
      )}

      {/* Latest Scan Status (when no active scan) */}
      {!progress && latestScan && <LatestScanCard scan={latestScan} />}

      {/* LUFS Analysis Status */}
      {lufsProgress && (lufsProgress.isRunning || lufsProgress.pendingTracks > 0) && (
        <AnalysisProgressBar type="lufs" progress={lufsProgress} />
      )}

      {/* DJ Analysis Status */}
      {djProgress && (djProgress.isRunning || djProgress.pendingTracks > 0) && (
        <AnalysisProgressBar type="dj" progress={djProgress} />
      )}

      {/* Info Box */}
      <CollapsibleInfo title={t('admin.scanner.scanInfoTitle')}>
        <p dangerouslySetInnerHTML={{ __html: t('admin.scanner.scanInfoLine1') }} />
        <p>{t('admin.scanner.scanInfoLine2')}</p>
      </CollapsibleInfo>

      {/* History Toggle */}
      <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
        <RefreshCw size={16} />
        <span>{showHistory ? t('admin.scanner.hideHistory') : t('admin.scanner.showHistory')}</span>
      </button>

      {/* History List */}
      {showHistory && (
        <div className={styles.history}>
          {historyLoading ? (
            <p className={styles.historyEmpty}>{t('admin.scanner.loadingHistory')}</p>
          ) : !history?.scans || history.scans.length === 0 ? (
            <p className={styles.historyEmpty}>{t('admin.scanner.noHistory')}</p>
          ) : (
            <div className={styles.historyList}>
              {history.scans.map(
                (scan: {
                  id: string;
                  status: string;
                  startedAt: string;
                  tracksAdded?: number;
                  tracksUpdated?: number;
                  tracksDeleted?: number;
                }) => (
                  <div key={scan.id} className={styles.historyItem}>
                    <div className={styles.historyItemHeader}>
                      {getStatusIcon(scan.status)}
                      <span className={styles.historyItemDate}>
                        {formatDateShort(scan.startedAt)}
                      </span>
                    </div>
                    <div className={styles.historyItemStats}>
                      <span>+{scan.tracksAdded || 0}</span>
                      <span>~{scan.tracksUpdated || 0}</span>
                      <span>-{scan.tracksDeleted || 0}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
