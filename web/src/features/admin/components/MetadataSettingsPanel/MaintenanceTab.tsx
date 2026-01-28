import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button, CollapsibleInfo, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import type { NotificationType } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import { formatBytes } from '@shared/utils/format';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { MissingFilesPanel } from '../MissingFilesPanel';
import { logger } from '@shared/utils/logger';
import { StorageStatsGrid, type StorageStats } from './StorageStatsGrid';
import { StoragePathsList, type StoragePaths } from './StoragePathsList';
import styles from './MaintenanceTab.module.css';

interface CleanupResult {
  filesRemoved: number;
  spaceFree: number;
  orphanedFiles: string[];
  errors: string[];
}

interface PopulateResult {
  albumsUpdated: number;
  artistsUpdated: number;
  duration: number;
}

/**
 * MaintenanceTab Component
 * Gestión de almacenamiento y limpieza de metadata
 */
export function MaintenanceTab() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [paths, setPaths] = useState<StoragePaths | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [populateResult, setPopulateResult] = useState<PopulateResult | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const [populateError, setPopulateError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  useEffect(() => {
    loadStats();
    loadPaths();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await apiClient.get('/maintenance/storage/stats');

      // Map response to expected format
      const mappedStats = {
        totalSize: response.data.totalSize || 0,
        totalFiles: response.data.totalFiles || 0,
        artistImages: response.data.artistsWithMetadata || 0,
        albumImages: response.data.albumsWithCovers || 0,
        orphanedFiles: response.data.orphanedFiles || 0,
      };

      setStats(mappedStats);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error loading storage stats:', error);
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadPaths = async () => {
    try {
      const response = await apiClient.get('/maintenance/storage/paths');
      setPaths(response.data);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error loading storage paths:', error);
      }
    }
  };

  const handleCleanupClick = () => {
    setShowCleanupConfirm(true);
  };

  const runCleanup = async () => {
    try {
      setIsCleaning(true);
      setCleanupResult(null);
      setNotification(null);
      setShowCleanupConfirm(false);

      const response = await apiClient.post('/maintenance/cleanup/orphaned?dryRun=false');
      setCleanupResult(response.data);

      // Auto-hide cleanup result after 5 seconds
      setTimeout(() => setCleanupResult(null), 5000);

      // Refrescar estadísticas
      await loadStats();
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error running cleanup:', err);
      }
      setNotification({ type: 'error', message: getApiErrorMessage(err, 'Error al ejecutar limpieza') });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCacheClick = () => {
    setShowCacheConfirm(true);
  };

  const clearCache = async () => {
    try {
      setShowCacheConfirm(false);
      setNotification(null);
      await apiClient.post('/admin/settings/cache/clear');
      setNotification({ type: 'success', message: 'Caché limpiado correctamente' });
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error clearing cache:', err);
      }
      setNotification({ type: 'error', message: getApiErrorMessage(err, 'Error al limpiar caché') });
    }
  };

  const handlePopulateSortNames = async () => {
    try {
      setIsPopulating(true);
      setPopulateError(null);
      const response = await apiClient.post('/maintenance/populate-sort-names');
      setPopulateResult(response.data);

      // Auto-hide populate result after 5 seconds
      setTimeout(() => setPopulateResult(null), 5000);

      // Refrescar estadísticas
      await loadStats();
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error populating sort names:', err);
      }
      setPopulateError(getApiErrorMessage(err, 'Error al generar nombres de ordenamiento'));
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Storage Stats */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Almacenamiento</h3>
          <button
            className={styles.refreshButton}
            onClick={loadStats}
            disabled={isLoadingStats}
          >
            {isLoadingStats ? (
              <>
                <RefreshCw size={16} className={styles.refreshButton__spinner} />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Actualizar
              </>
            )}
          </button>
        </div>

        {isLoadingStats ? (
          <div className={styles.loading}>Cargando estadísticas...</div>
        ) : stats ? (
          <StorageStatsGrid stats={stats} />
        ) : (
          <div className={styles.error}>Error al cargar estadísticas</div>
        )}
      </div>

      {/* Storage Paths */}
      {paths && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Rutas de Almacenamiento</h3>
          </div>
          <StoragePathsList paths={paths} />
        </div>
      )}

      {/* Cleanup Actions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Limpieza</h3>
          <p className={styles.sectionDescription}>
            Elimina archivos huérfanos y limpia el caché de metadata
          </p>
        </div>

        <div className={styles.actionsGrid}>
          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <Trash2 size={20} className={styles.actionIcon} />
              <div className={styles.actionInfo}>
                <h4 className={styles.actionTitle}>Limpiar Archivos Huérfanos</h4>
                <p className={styles.actionDescription}>
                  Elimina archivos de metadata que no están asociados a ningún artista o álbum
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handleCleanupClick}
              loading={isCleaning}
              disabled={isCleaning}
              leftIcon={<Trash2 size={18} />}
            >
              Ejecutar Limpieza
            </Button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <RefreshCw size={20} className={styles.actionIcon} />
              <div className={styles.actionInfo}>
                <h4 className={styles.actionTitle}>Limpiar Caché</h4>
                <p className={styles.actionDescription}>
                  Elimina el caché de respuestas de APIs externas (Last.fm, Fanart.tv)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handleCacheClick}
              leftIcon={<RefreshCw size={18} />}
            >
              Limpiar Caché
            </Button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <CheckCircle size={20} className={styles.actionIcon} />
              <div className={styles.actionInfo}>
                <h4 className={styles.actionTitle}>Generar Nombres de Ordenamiento</h4>
                <p className={styles.actionDescription}>
                  Genera orderAlbumName y orderArtistName para álbumes existentes (necesario para orden alfabético)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handlePopulateSortNames}
              loading={isPopulating}
              disabled={isPopulating}
              leftIcon={<CheckCircle size={18} />}
            >
              Generar Nombres
            </Button>
          </div>
        </div>

        {/* Cleanup Result */}
        {cleanupResult && (
          <div className={styles.resultBox}>
            <CheckCircle size={20} className={styles.resultIcon} />
            <div className={styles.resultContent}>
              <p className={styles.resultTitle}>Limpieza completada</p>
              <div className={styles.resultStats}>
                <span>
                  <strong>{cleanupResult.filesRemoved || 0}</strong> archivos eliminados
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>
                  <strong>{formatBytes(cleanupResult.spaceFree || 0)}</strong> recuperados
                </span>
                {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                  <>
                    <span className={styles.resultDivider}>•</span>
                    <span className={styles.resultWarning}>
                      <strong>{cleanupResult.errors.length}</strong> errores
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Populate Result */}
        {populateResult && (
          <div className={styles.resultBox}>
            <CheckCircle size={20} className={styles.resultIcon} />
            <div className={styles.resultContent}>
              <p className={styles.resultTitle}>Nombres generados correctamente</p>
              <div className={styles.resultStats}>
                <span>
                  <strong>{populateResult.albumsUpdated}</strong> álbumes actualizados
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>
                  <strong>{populateResult.artistsUpdated}</strong> artistas actualizados
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>
                  {(populateResult.duration / 1000).toFixed(2)}s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Populate Error */}
        {populateError && (
          <div className={styles.resultBox} style={{ borderColor: '#ef4444' }}>
            <AlertCircle size={20} style={{ color: '#ef4444' }} />
            <div className={styles.resultContent}>
              <p className={styles.resultTitle} style={{ color: '#ef4444' }}>Error al generar nombres</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{populateError}</p>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onDismiss={() => setNotification(null)}
            autoHideMs={3000}
          />
        )}
      </div>

      {/* Missing Files Panel */}
      <MissingFilesPanel />

      {/* Info Box */}
      <CollapsibleInfo title="Sobre la limpieza">
        <p>
          La limpieza eliminará archivos que no están referenciados en la base de datos.
          Se recomienda ejecutarla periódicamente para liberar espacio en disco.
        </p>
        <p>
          El caché se reconstruirá automáticamente cuando sea necesario.
        </p>
      </CollapsibleInfo>

      {/* Modals */}
      {showCleanupConfirm && (
        <ConfirmDialog
          title="Limpiar Archivos Huérfanos"
          message="¿Estás seguro de que deseas limpiar archivos huérfanos y obsoletos? Esta acción no se puede deshacer."
          confirmText="Ejecutar Limpieza"
          onConfirm={runCleanup}
          onCancel={() => setShowCleanupConfirm(false)}
          isLoading={isCleaning}
        />
      )}

      {showCacheConfirm && (
        <ConfirmDialog
          title="Limpiar Caché de Metadata"
          message="¿Estás seguro de que deseas limpiar el caché de metadata? El caché se reconstruirá automáticamente cuando sea necesario."
          confirmText="Limpiar Caché"
          onConfirm={clearCache}
          onCancel={() => setShowCacheConfirm(false)}
          isLoading={false}
        />
      )}
    </div>
  );
}
