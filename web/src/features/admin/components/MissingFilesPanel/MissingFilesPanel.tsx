import { useState } from 'react';
import { FileX, Trash2, RefreshCw, CheckCircle, Clock, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, CollapsibleInfo, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { useMissingFiles } from '../../hooks/useMissingFiles';
import styles from './MissingFilesPanel.module.css';

/**
 * Panel de gestión de pistas con archivos no encontrados en disco.
 */
export function MissingFilesPanel() {
  const { t, i18n } = useTranslation();
  const {
    tracks,
    purgeMode,
    isLoading,
    isPurging,
    deletingId,
    notification,
    dismiss,
    loadMissingFiles,
    handlePurge,
    handleDeleteTrack,
    handleSaveSettings,
    newPurgeMode,
    setNewPurgeMode,
    purgeDays,
    setPurgeDays,
  } = useMissingFiles();

  // UI-only state (modal visibility)
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPurgeModeLabel = (mode: string) => {
    if (mode === 'never') return t('admin.missingFiles.purgeNever');
    if (mode === 'always') return t('admin.missingFiles.purgeAlways');
    if (mode.startsWith('after_days:')) {
      const days = mode.replace('after_days:', '');
      return t('admin.missingFiles.purgeAfterDays', { days });
    }
    return mode;
  };

  const onPurge = async () => {
    setShowPurgeConfirm(false);
    await handlePurge();
  };

  const onSaveSettings = async () => {
    const ok = await handleSaveSettings();
    if (ok) setShowSettingsModal(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <FileX size={24} className={styles.headerIcon} />
            <h2 className={styles.title}>{t('admin.missingFiles.title')}</h2>
          </div>
          <p className={styles.description}>{t('admin.missingFiles.description')}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.settingsButton}
            onClick={() => setShowSettingsModal(true)}
            title={t('admin.missingFiles.purgeSettings')}
          >
            <Settings size={18} />
          </button>
          <button
            className={styles.refreshButton}
            onClick={() => loadMissingFiles()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className={styles.spinner} />
                {t('admin.missingFiles.refreshing')}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {t('admin.missingFiles.refresh')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <FileX size={18} className={styles.statIcon} />
          <span className={styles.statLabel}>{t('admin.missingFiles.missingTracks')}</span>
          <span className={styles.statValue}>{tracks.length}</span>
        </div>
        <div className={styles.statItem}>
          <Clock size={18} className={styles.statIcon} />
          <span className={styles.statLabel}>{t('admin.missingFiles.purgeMode')}</span>
          <span className={styles.statValue}>{getPurgeModeLabel(purgeMode)}</span>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={dismiss}
          autoHideMs={3000}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <div className={styles.loading}>{t('admin.missingFiles.loadingMissing')}</div>
      ) : tracks.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>{t('admin.missingFiles.noMissingFiles')}</h3>
          <p className={styles.emptyDescription}>{t('admin.missingFiles.noMissingDescription')}</p>
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
              {t('admin.missingFiles.purgeAll')}
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
                      {t('admin.missingFiles.missingSince', { date: formatDate(track.missingAt) })}
                    </span>
                  </div>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteTrack(track.id)}
                  disabled={deletingId === track.id}
                  title={t('admin.missingFiles.deleteTrack')}
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
      <CollapsibleInfo title={t('admin.missingFiles.aboutTitle')}>
        <p>{t('admin.missingFiles.aboutParagraph1')}</p>
        <p>{t('admin.missingFiles.aboutParagraph2')}</p>
        <p>{t('admin.missingFiles.aboutParagraph3')}</p>
      </CollapsibleInfo>

      {/* Purge Confirm Dialog */}
      {showPurgeConfirm && (
        <ConfirmDialog
          title={t('admin.missingFiles.purgeConfirmTitle')}
          message={t('admin.missingFiles.purgeConfirmMessage', { count: tracks.length })}
          confirmText={t('admin.missingFiles.purgeConfirmButton')}
          onConfirm={onPurge}
          onCancel={() => setShowPurgeConfirm(false)}
          isLoading={isPurging}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t('admin.missingFiles.settingsTitle')}</h3>
              <button className={styles.modalClose} onClick={() => setShowSettingsModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalContent}>
              <p className={styles.modalDescription}>
                {t('admin.missingFiles.settingsDescription')}
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
                    <span className={styles.radioLabel}>{t('admin.missingFiles.neverDelete')}</span>
                    <span className={styles.radioDescription}>
                      {t('admin.missingFiles.neverDeleteDesc')}
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
                    <span className={styles.radioLabel}>
                      {t('admin.missingFiles.deleteImmediately')}
                    </span>
                    <span className={styles.radioDescription}>
                      {t('admin.missingFiles.deleteImmediatelyDesc')}
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
                    <span className={styles.radioLabel}>
                      {t('admin.missingFiles.deleteAfterNDays')}
                    </span>
                    <span className={styles.radioDescription}>
                      {t('admin.missingFiles.deleteAfterNDaysDesc')}
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
                        <span>{t('admin.missingFiles.days')}</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button variant="ghost" size="md" onClick={() => setShowSettingsModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" size="md" onClick={onSaveSettings}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
