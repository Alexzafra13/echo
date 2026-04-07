import {
  FolderOpen,
  Folder,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronUp,
  Music,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLibraryBrowser } from '../../hooks/useLibraryBrowser';
import styles from './LibraryPanel.module.css';

/**
 * LibraryPanel Component
 * Panel para gestionar la ruta de la biblioteca de música
 */
export function LibraryPanel() {
  const { t } = useTranslation();
  const {
    config,
    loading,
    saving,
    error,
    success,
    showBrowser,
    setShowBrowser,
    browser,
    browsing,
    handleBrowse,
    handleSelectPath,
    openBrowser,
  } = useLibraryBrowser();

  const { currentPath, directories, parentPath } = browser;

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>
            <FolderOpen size={24} className={styles.headerIcon} />
            <h2 className={styles.title}>{t('admin.library.title')}</h2>
          </div>
          <p className={styles.description}>{t('admin.library.description')}</p>
        </div>
      </div>

      {/* Current Path Card */}
      <div className={styles.pathCard}>
        <div className={styles.pathHeader}>
          <FolderOpen size={24} className={styles.pathIcon} />
          <div className={styles.pathInfo}>
            <span className={styles.pathLabel}>{t('admin.library.currentPath')}</span>
            <span className={styles.pathValue}>
              {config?.path || t('admin.library.notConfigured')}
            </span>
          </div>
          {config?.exists && config?.readable && (
            <div className={styles.pathStatus}>
              <Check size={16} />
              <span>
                {t('admin.library.files', { count: config.fileCount })}
                {(config.videoCount ?? 0) > 0
                  ? ` · ${config.videoCount === 1 ? t('admin.library.video', { count: config.videoCount }) : t('admin.library.videos', { count: config.videoCount })}`
                  : ''}
              </span>
            </div>
          )}
          {config?.exists === false && (
            <div className={styles.pathStatusError}>
              <AlertCircle size={16} />
              <span>{t('admin.library.doesNotExist')}</span>
            </div>
          )}
        </div>

        <button className={styles.changeButton} onClick={openBrowser}>
          <FolderOpen size={16} />
          {t('admin.library.changePath')}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Directory Browser */}
      {showBrowser && (
        <div className={styles.browser}>
          <div className={styles.browserHeader}>
            <h3 className={styles.browserTitle}>{t('admin.library.selectFolder')}</h3>
            <button className={styles.browserClose} onClick={() => setShowBrowser(false)}>
              {t('common.cancel')}
            </button>
          </div>

          {/* Current path */}
          <div className={styles.browserPath}>
            <span className={styles.browserPathLabel}>{t('admin.library.location')}</span>
            <code className={styles.browserPathValue}>{currentPath}</code>
          </div>

          {/* Navigation */}
          <div className={styles.browserNav}>
            {parentPath && (
              <button
                className={styles.navButton}
                onClick={() => handleBrowse(parentPath)}
                disabled={browsing}
              >
                <ChevronUp size={16} />
                {t('admin.library.goUp')}
              </button>
            )}

            {/* Quick access to mounted paths */}
            {config?.mountedPaths.map((mountPath) => (
              <button
                key={mountPath}
                className={`${styles.navButton} ${currentPath.startsWith(mountPath) ? styles.navButtonActive : ''}`}
                onClick={() => handleBrowse(mountPath)}
                disabled={browsing}
              >
                {mountPath}
              </button>
            ))}
          </div>

          {/* Directory list */}
          <div className={styles.directoryList}>
            {browsing ? (
              <div className={styles.browserLoading}>
                <RefreshCw size={20} className={styles.spinner} />
                {t('common.loading')}
              </div>
            ) : directories.length === 0 ? (
              <div className={styles.browserEmpty}>{t('admin.library.noSubdirectories')}</div>
            ) : (
              directories.map((dir) => (
                <div
                  key={dir.path}
                  className={`${styles.directoryItem} ${!dir.readable ? styles.directoryItemDisabled : ''}`}
                >
                  <button
                    className={styles.directoryButton}
                    onClick={() => handleBrowse(dir.path)}
                    disabled={!dir.readable || browsing}
                  >
                    <Folder size={18} />
                    <span className={styles.directoryName}>{dir.name}</span>
                    {dir.hasMusic && <Music size={14} className={styles.musicIcon} />}
                    <ChevronRight size={16} className={styles.chevron} />
                  </button>

                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelectPath(dir.path)}
                    disabled={!dir.readable || saving}
                  >
                    {saving ? t('common.saving') : t('admin.library.select')}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Select current folder button */}
          <div className={styles.browserActions}>
            <button
              className={styles.selectCurrentButton}
              onClick={() => handleSelectPath(currentPath)}
              disabled={saving}
            >
              <Check size={16} />
              {saving
                ? t('common.saving')
                : t('admin.library.useThisFolder', { path: currentPath })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
