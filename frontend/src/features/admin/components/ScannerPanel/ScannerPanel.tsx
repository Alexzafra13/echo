import { useState, useEffect } from 'react';
import { Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Music, Disc, User, Image } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useScannerHistory, useStartScan } from '../../hooks/useScanner';
import { useScannerWebSocket } from '@shared/hooks/useScannerWebSocket';
import { useAuthStore } from '@features/auth/stores/authStore';
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

  const { data: history, isLoading: historyLoading, refetch } = useScannerHistory();
  const { mutate: startScan, isPending: isScanning, data: scanResponse } = useStartScan();
  const { user } = useAuthStore();

  // WebSocket para progreso en tiempo real
  const { progress, errors, isCompleted, isConnected } = useScannerWebSocket(
    currentScanId,
    user?.accessToken || null
  );

  // Cuando se inicia un scan, guardar el ID para WebSocket
  useEffect(() => {
    if (scanResponse?.id) {
      setCurrentScanId(scanResponse.id);
    }
  }, [scanResponse]);

  // Cuando el scan se completa, refrescar historial
  useEffect(() => {
    if (isCompleted) {
      setTimeout(() => {
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
          setTimeout(() => refetch(), 1000);
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
      default:
        return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Librería Musical</h2>
          <p className={styles.description}>
            Escanea tu carpeta de música para importar canciones, álbumes y artistas
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleStartScan}
          loading={isScanning}
          leftIcon={<Play size={18} />}
          disabled={isScanning}
        >
          {isScanning ? 'Escaneando...' : 'Escanear Ahora'}
        </Button>
      </div>

      {/* Real-time Scan Progress */}
      {progress && currentScanId && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <RefreshCw size={20} className={styles.statusIconRunning} />
            <div className={styles.statusInfo}>
              <h3 className={styles.statusTitle}>{progress.message || 'Escaneando...'}</h3>
              <p className={styles.statusDate}>
                {isConnected ? '🔌 Conectado' : '⚠️ Desconectado'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress.progress}%` }}
            />
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
              <span className={styles.currentFileName}>{progress.currentFile.split(/[/\\]/).pop()}</span>
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
              <h3 className={styles.statusTitle}>
                {getStatusText(latestScan.status)}
              </h3>
              <p className={styles.statusDate}>
                {formatDate(latestScan.startedAt)}
              </p>
            </div>
          </div>

          {latestScan.status === 'completed' && (
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {latestScan.tracksAdded || 0}
                </span>
                <span className={styles.statLabel}>Añadidos</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {latestScan.tracksUpdated || 0}
                </span>
                <span className={styles.statLabel}>Actualizados</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {latestScan.tracksDeleted || 0}
                </span>
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

      {/* Info Box */}
      <div className={styles.infoBox}>
        <AlertCircle size={20} className={styles.infoIcon} />
        <div className={styles.infoContent}>
          <p className={styles.infoTitle}>Escaneo de música:</p>
          <p className={styles.infoHint}>
            El servidor escaneará la carpeta configurada en UPLOAD_PATH (por defecto: ./uploads/music).
            Asegúrate de que la carpeta contiene archivos MP3, FLAC, M4A u otros formatos soportados.
          </p>
        </div>
      </div>

      {/* History Toggle */}
      <button
        className={styles.historyToggle}
        onClick={() => setShowHistory(!showHistory)}
      >
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
              {history.scans.map((scan: any) => (
                <div key={scan.id} className={styles.historyItem}>
                  <div className={styles.historyItemHeader}>
                    {getStatusIcon(scan.status)}
                    <span className={styles.historyItemDate}>
                      {formatDate(scan.startedAt)}
                    </span>
                  </div>
                  <div className={styles.historyItemStats}>
                    <span>+{scan.tracksAdded || 0}</span>
                    <span>~{scan.tracksUpdated || 0}</span>
                    <span>-{scan.tracksDeleted || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
