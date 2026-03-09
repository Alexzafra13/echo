import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Music,
  Disc,
  User,
  Image,
  Volume2,
  Music2,
  Library,
} from 'lucide-react';
import { ScanStatus } from '@shared/hooks/useScannerWebSocket';
import { CollapsibleInfo } from '@shared/components/ui';
import { useScannerHistory, useStartScan } from '../../hooks/useScanner';
import { useScannerWebSocket } from '@shared/hooks/useScannerWebSocket';
import { useAuthStore } from '@shared/store';
import { formatDateShort } from '@shared/utils/format';
import styles from './ScannerPanel.module.css';

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

  const isPaused = progress?.status === ScanStatus.PAUSED;
  const isRunning =
    progress?.status === ScanStatus.SCANNING ||
    progress?.status === ScanStatus.AGGREGATING ||
    progress?.status === ScanStatus.EXTRACTING_COVERS;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className={styles.statusIconSuccess} />;
      case 'failed':
        return <XCircle size={20} className={styles.statusIconError} />;
      case 'running':
        return <RefreshCw size={20} className={styles.statusIconRunning} />;
      case 'paused':
        return <Pause size={20} className={styles.statusIconPaused} />;
      case 'cancelled':
        return <Square size={20} className={styles.statusIconError} />;
      default:
        return <Clock size={20} className={styles.statusIconPending} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'failed':
        return 'Fallido';
      case 'running':
        return 'En progreso';
      case 'pending':
        return 'Pendiente';
      case 'paused':
        return 'En pausa';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>
            <Library size={24} className={styles.headerIcon} />
            <h2 className={styles.title}>Librería Musical</h2>
          </div>
          <p className={styles.description}>
            Escanea tu carpeta de música para importar canciones, álbumes y artistas
          </p>
        </div>
        <button className={styles.scanButton} onClick={handleStartScan} disabled={isScanning}>
          {isScanning ? (
            <>
              <RefreshCw size={16} className={styles.scanButton__spinner} />
              Escaneando...
            </>
          ) : (
            <>
              <Play size={16} />
              Escanear Ahora
            </>
          )}
        </button>
      </div>

      {/* Real-time Scan Progress */}
      {progress && currentScanId && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            {isPaused ? (
              <Pause size={20} className={styles.statusIconPaused} />
            ) : (
              <RefreshCw size={20} className={styles.statusIconRunning} />
            )}
            <div className={styles.statusInfo}>
              <h3 className={styles.statusTitle}>
                {isPaused ? 'Scan en pausa' : progress.message || 'Escaneando...'}
              </h3>
              <p className={styles.statusDate}>
                {isConnected ? '🔌 Conectado' : '⚠️ Desconectado'}
              </p>
            </div>
            <div className={styles.scanControls}>
              {isRunning && (
                <button className={styles.controlButton} onClick={pauseScan} title="Pausar scan">
                  <Pause size={16} />
                </button>
              )}
              {isPaused && (
                <button
                  className={`${styles.controlButton} ${styles.controlButtonResume}`}
                  onClick={resumeScan}
                  title="Reanudar scan"
                >
                  <Play size={16} />
                </button>
              )}
              {(isRunning || isPaused) && (
                <button
                  className={`${styles.controlButton} ${styles.controlButtonCancel}`}
                  onClick={() => cancelScan()}
                  title="Cancelar scan"
                >
                  <Square size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress.progress}%` }} />
            <span className={styles.progressText}>{progress.progress}%</span>
          </div>

          {/* Real-time Stats */}
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <Music size={16} className={styles.statIcon} />
              <span className={styles.statValue}>{progress.tracksCreated}</span>
              <span className={styles.statLabel}>Tracks</span>
            </div>
            <div className={styles.statItem}>
              <Disc size={16} className={styles.statIcon} />
              <span className={styles.statValue}>{progress.albumsCreated}</span>
              <span className={styles.statLabel}>Álbumes</span>
            </div>
            <div className={styles.statItem}>
              <User size={16} className={styles.statIcon} />
              <span className={styles.statValue}>{progress.artistsCreated}</span>
              <span className={styles.statLabel}>Artistas</span>
            </div>
            <div className={styles.statItem}>
              <Image size={16} className={styles.statIcon} />
              <span className={styles.statValue}>{progress.coversExtracted}</span>
              <span className={styles.statLabel}>Covers</span>
            </div>
          </div>

          {/* File Counter */}
          <div className={styles.fileCounter}>
            <span>
              {progress.filesScanned} / {progress.totalFiles} archivos procesados
            </span>
            {progress.errors > 0 && (
              <span className={styles.errorCount}>
                <AlertCircle size={14} /> {progress.errors} errores
              </span>
            )}
          </div>

          {/* Current File */}
          {progress.currentFile && (
            <div className={styles.currentFile}>
              <span className={styles.currentFileLabel}>Procesando:</span>
              <span className={styles.currentFileName}>
                {progress.currentFile.split(/[/\\]/).pop()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Latest Scan Status (when no active scan) */}
      {!progress && latestScan && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            {getStatusIcon(latestScan.status)}
            <div className={styles.statusInfo}>
              <h3 className={styles.statusTitle}>{getStatusText(latestScan.status)}</h3>
              <p className={styles.statusDate}>{formatDateShort(latestScan.startedAt)}</p>
            </div>
          </div>

          {latestScan.status === 'completed' && (
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{latestScan.tracksAdded || 0}</span>
                <span className={styles.statLabel}>Añadidos</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{latestScan.tracksUpdated || 0}</span>
                <span className={styles.statLabel}>Actualizados</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{latestScan.tracksDeleted || 0}</span>
                <span className={styles.statLabel}>Eliminados</span>
              </div>
            </div>
          )}

          {latestScan.errorMessage && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{latestScan.errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* LUFS Analysis Status - Compact */}
      {lufsProgress && (lufsProgress.isRunning || lufsProgress.pendingTracks > 0) && (
        <div className={styles.lufsBar}>
          <Volume2
            size={14}
            className={lufsProgress.isRunning ? styles.lufsIconRunning : styles.lufsIcon}
          />
          <span className={styles.lufsText}>
            LUFS: {lufsProgress.processedInSession}/
            {lufsProgress.processedInSession + lufsProgress.pendingTracks}
            {lufsProgress.processedInSession + lufsProgress.pendingTracks > 0 && (
              <span className={styles.lufsPercent}>
                (
                {Math.round(
                  (lufsProgress.processedInSession /
                    (lufsProgress.processedInSession + lufsProgress.pendingTracks)) *
                    100
                )}
                %)
              </span>
            )}
          </span>
          {lufsProgress.estimatedTimeRemaining && (
            <span className={styles.lufsEta}>~{lufsProgress.estimatedTimeRemaining}</span>
          )}
          {lufsProgress.isRunning && (
            <div className={styles.lufsProgressInline}>
              <div
                className={styles.lufsProgressFill}
                style={{
                  width: `${Math.round((lufsProgress.processedInSession / (lufsProgress.processedInSession + lufsProgress.pendingTracks)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* DJ Analysis Status - Compact */}
      {djProgress && (djProgress.isRunning || djProgress.pendingTracks > 0) && (
        <div className={styles.djBar}>
          <Music2
            size={14}
            className={djProgress.isRunning ? styles.djIconRunning : styles.djIcon}
          />
          <span className={styles.djText}>
            DJ: {djProgress.processedInSession}/
            {djProgress.processedInSession + djProgress.pendingTracks}
            {djProgress.processedInSession + djProgress.pendingTracks > 0 && (
              <span className={styles.djPercent}>
                (
                {Math.round(
                  (djProgress.processedInSession /
                    (djProgress.processedInSession + djProgress.pendingTracks)) *
                    100
                )}
                %)
              </span>
            )}
          </span>
          {djProgress.estimatedTimeRemaining && (
            <span className={styles.djEta}>~{djProgress.estimatedTimeRemaining}</span>
          )}
          {djProgress.isRunning && (
            <div className={styles.djProgressInline}>
              <div
                className={styles.djProgressFill}
                style={{
                  width: `${Math.round((djProgress.processedInSession / (djProgress.processedInSession + djProgress.pendingTracks)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <CollapsibleInfo title="Escaneo de música">
        <p>
          El servidor escaneará la carpeta configurada en UPLOAD_PATH (por defecto:{' '}
          <code>./uploads/music</code>).
        </p>
        <p>
          Asegúrate de que la carpeta contiene archivos MP3, FLAC, M4A u otros formatos soportados.
        </p>
      </CollapsibleInfo>

      {/* History Toggle */}
      <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
        <RefreshCw size={16} />
        <span>{showHistory ? 'Ocultar' : 'Ver'} historial de escaneos</span>
      </button>

      {/* History List */}
      {showHistory && (
        <div className={styles.history}>
          {historyLoading ? (
            <p className={styles.historyEmpty}>Cargando historial...</p>
          ) : !history?.scans || history.scans.length === 0 ? (
            <p className={styles.historyEmpty}>No hay escaneos anteriores</p>
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
