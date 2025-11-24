import { useState, useEffect } from 'react';
import { HardDrive, Trash2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button, CollapsibleInfo } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import { ConfirmDialog } from '../UsersPanel/ConfirmDialog';
import { useToast } from '@shared/context/ToastContext';
import styles from './MaintenanceTab.module.css';

interface StorageStats {
  totalSize: number;
  totalFiles: number;
  artistImages: number;
  albumImages: number;
  orphanedFiles: number;
}

interface CleanupResult {
  deleted: number;
  reclaimed: number;
  missing: number;
}

/**
 * MaintenanceTab Component
 * Gestión de almacenamiento y limpieza de metadata
 */
export function MaintenanceTab() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadStats();
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
        console.error('Error loading storage stats:', error);
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleCleanupClick = () => {
    setShowCleanupConfirm(true);
  };

  const runCleanup = async () => {
    try {
      setIsCleaning(true);
      setCleanupResult(null);
      setShowCleanupConfirm(false);

      const response = await apiClient.post('/maintenance/cleanup/orphaned?dryRun=false');
      setCleanupResult(response.data);

      // Refrescar estadísticas
      await loadStats();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error running cleanup:', error);
      }
      addToast(error.response?.data?.message || 'Error al ejecutar limpieza', 'error');
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
      await apiClient.post('/admin/settings/cache/clear');
      addToast('Caché limpiado correctamente', 'success');
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error clearing cache:', error);
      }
      addToast(error.response?.data?.message || 'Error al limpiar caché', 'error');
    }
  };

  const handlePopulateSortNames = async () => {
    try {
      setIsPopulating(true);
      const response = await apiClient.post('/maintenance/populate-sort-names');
      addToast(
        `Nombres generados: ${response.data.albumsUpdated} álbumes, ${response.data.artistsUpdated} artistas`,
        'success'
      );
      // Refrescar estadísticas
      await loadStats();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error populating sort names:', error);
      }
      addToast(error.response?.data?.message || 'Error al generar nombres', 'error');
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
        ) : (
          <div className={styles.error}>Error al cargar estadísticas</div>
        )}
      </div>

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
                  <strong>{cleanupResult.deleted || 0}</strong> archivos eliminados
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>
                  <strong>{formatBytes(cleanupResult.reclaimed || 0)}</strong> recuperados
                </span>
                {(cleanupResult.missing || 0) > 0 && (
                  <>
                    <span className={styles.resultDivider}>•</span>
                    <span className={styles.resultWarning}>
                      <strong>{cleanupResult.missing}</strong> referencias faltantes
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
