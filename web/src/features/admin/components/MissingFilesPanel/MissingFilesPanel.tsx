import { useState, useEffect } from 'react';
import { FileX, Trash2, RefreshCw, CheckCircle, Clock, Settings } from 'lucide-react';
import { Button, CollapsibleInfo, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import type { NotificationType } from '@shared/components/ui';
import {
  getMissingFiles,
  purgeMissingFiles,
  deleteMissingTrack,
  updatePurgeMode,
  MissingTrack,
} from '../../api/missing-files.api';
import styles from './MissingFilesPanel.module.css';

/**
 * MissingFilesPanel Component
 * Panel for managing tracks marked as missing (file not found on disk)
 */
export function MissingFilesPanel() {
  const [tracks, setTracks] = useState<MissingTrack[]>([]);
  const [purgeMode, setPurgeMode] = useState<string>('never');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPurgeMode, setNewPurgeMode] = useState('never');
  const [purgeDays, setPurgeDays] = useState(30);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  useEffect(() => {
    loadMissingFiles();
  }, []);

  const loadMissingFiles = async () => {
    try {
      setIsLoading(true);
      const data = await getMissingFiles();
      setTracks(data.tracks);
      setPurgeMode(data.purgeMode);

      // Parse purge mode for settings
      if (data.purgeMode.startsWith('after_days:')) {
        setNewPurgeMode('after_days');
        setPurgeDays(parseInt(data.purgeMode.replace('after_days:', ''), 10));
      } else {
        setNewPurgeMode(data.purgeMode);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading missing files:', error);
      }
      setNotification({ type: 'error', message: 'Error al cargar archivos desaparecidos' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurge = async () => {
    try {
      setIsPurging(true);
      setShowPurgeConfirm(false);
      const result = await purgeMissingFiles();
      setNotification({ type: 'success', message: result.message });
      await loadMissingFiles();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error purging missing files:', error);
      }
      setNotification({ type: 'error', message: 'Error al purgar archivos' });
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      setDeletingId(trackId);
      const result = await deleteMissingTrack(trackId);
      if (result.success) {
        setNotification({ type: 'success', message: result.message });
        setTracks(prev => prev.filter(t => t.id !== trackId));
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting track:', error);
      }
      setNotification({ type: 'error', message: 'Error al eliminar track' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const mode = newPurgeMode === 'after_days' ? `after_days:${purgeDays}` : newPurgeMode;
      await updatePurgeMode(mode);
      setPurgeMode(mode);
      setShowSettingsModal(false);
      setNotification({ type: 'success', message: 'Configuracion guardada' });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving settings:', error);
      }
      setNotification({ type: 'error', message: 'Error al guardar configuracion' });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPurgeModeLabel = (mode: string) => {
    if (mode === 'never') return 'Nunca eliminar';
    if (mode === 'always') return 'Eliminar inmediatamente';
    if (mode.startsWith('after_days:')) {
      const days = mode.replace('after_days:', '');
      return `Eliminar despues de ${days} dias`;
    }
    return mode;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <FileX size={24} className={styles.headerIcon} />
            <h2 className={styles.title}>Archivos Desaparecidos</h2>
          </div>
          <p className={styles.description}>
            Tracks marcados como desaparecidos (archivo no encontrado en disco)
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.settingsButton}
            onClick={() => setShowSettingsModal(true)}
            title="Configuracion de purga"
          >
            <Settings size={18} />
          </button>
          <button
            className={styles.refreshButton}
            onClick={loadMissingFiles}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className={styles.spinner} />
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
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <FileX size={18} className={styles.statIcon} />
          <span className={styles.statLabel}>Tracks desaparecidos:</span>
          <span className={styles.statValue}>{tracks.length}</span>
        </div>
        <div className={styles.statItem}>
          <Clock size={18} className={styles.statIcon} />
          <span className={styles.statLabel}>Modo de purga:</span>
          <span className={styles.statValue}>{getPurgeModeLabel(purgeMode)}</span>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <div className={styles.loading}>Cargando archivos desaparecidos...</div>
      ) : tracks.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No hay archivos desaparecidos</h3>
          <p className={styles.emptyDescription}>
            Todos los archivos de tu biblioteca estan presentes en disco
          </p>
        </div>
      ) : (
        <>
          {/* Actions */}
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowPurgeConfirm(true)}
              loading={isPurging}
              disabled={isPurging || tracks.length === 0}
              leftIcon={<Trash2 size={18} />}
            >
              Purgar Todos
            </Button>
          </div>

          {/* Tracks List */}
          <div className={styles.tracksList}>
            {tracks.map((track) => (
              <div key={track.id} className={styles.trackItem}>
                <div className={styles.trackInfo}>
                  <div className={styles.trackMain}>
                    <span className={styles.trackTitle}>{track.title}</span>
                    {track.artistName && (
                      <span className={styles.trackArtist}>{track.artistName}</span>
                    )}
                  </div>
                  <div className={styles.trackMeta}>
                    {track.albumName && (
                      <span className={styles.trackAlbum}>{track.albumName}</span>
                    )}
                    <code className={styles.trackPath}>{track.path}</code>
                    <span className={styles.trackDate}>
                      <Clock size={12} />
                      Desaparecido: {formatDate(track.missingAt)}
                    </span>
                  </div>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteTrack(track.id)}
                  disabled={deletingId === track.id}
                  title="Eliminar track"
                >
                  {deletingId === track.id ? (
                    <RefreshCw size={16} className={styles.spinner} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Info Box */}
      <CollapsibleInfo title="Sobre los archivos desaparecidos">
        <p>
          Cuando un archivo de musica es eliminado o movido del disco, el track se marca como
          "desaparecido" en lugar de eliminarse inmediatamente de la base de datos.
        </p>
        <p>
          Esto permite conservar las valoraciones, listas de reproduccion y estadisticas
          de reproduccion en caso de que el archivo vuelva a aparecer.
        </p>
        <p>
          Puedes configurar el modo de purga para controlar cuando se eliminan definitivamente
          los tracks desaparecidos.
        </p>
      </CollapsibleInfo>

      {/* Purge Confirm Dialog */}
      {showPurgeConfirm && (
        <ConfirmDialog
          title="Purgar Archivos Desaparecidos"
          message={`¿Estas seguro de que deseas eliminar ${tracks.length} track(s) desaparecido(s)? Esta accion no se puede deshacer y se eliminaran las valoraciones y estadisticas asociadas.`}
          confirmText="Purgar Todos"
          onConfirm={handlePurge}
          onCancel={() => setShowPurgeConfirm(false)}
          isLoading={isPurging}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Configuracion de Purga</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowSettingsModal(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalContent}>
              <p className={styles.modalDescription}>
                Configura cuando se eliminan automaticamente los tracks desaparecidos
              </p>

              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="never"
                    checked={newPurgeMode === 'never'}
                    onChange={(e) => setNewPurgeMode(e.target.value)}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Nunca eliminar</span>
                    <span className={styles.radioDescription}>
                      Mantener tracks desaparecidos indefinidamente
                    </span>
                  </div>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="always"
                    checked={newPurgeMode === 'always'}
                    onChange={(e) => setNewPurgeMode(e.target.value)}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Eliminar inmediatamente</span>
                    <span className={styles.radioDescription}>
                      Eliminar tracks tan pronto se detecte que el archivo no existe
                    </span>
                  </div>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="purgeMode"
                    value="after_days"
                    checked={newPurgeMode === 'after_days'}
                    onChange={(e) => setNewPurgeMode(e.target.value)}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Eliminar despues de N dias</span>
                    <span className={styles.radioDescription}>
                      Eliminar tracks que han estado desaparecidos por mas de:
                    </span>
                    {newPurgeMode === 'after_days' && (
                      <div className={styles.daysInput}>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={purgeDays}
                          onChange={(e) => setPurgeDays(parseInt(e.target.value, 10) || 30)}
                          className={styles.numberInput}
                        />
                        <span>dias</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveSettings}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
