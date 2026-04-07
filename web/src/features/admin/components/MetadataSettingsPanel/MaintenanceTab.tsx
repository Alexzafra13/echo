import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button, CollapsibleInfo, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { useNotification } from '@shared/hooks';
import { formatBytes } from '@shared/utils/format';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { MissingFilesPanel } from '../MissingFilesPanel';
import {
  useStorageStats,
  useStoragePaths,
  useCleanupOrphaned,
  useClearCache,
  usePopulateSortNames,
} from '../../hooks/useMaintenance';
import type { CleanupResult, PopulateResult } from '../../api/maintenance.service';
import { StorageStatsGrid } from './StorageStatsGrid';
import { StoragePathsList } from './StoragePathsList';
import styles from './MaintenanceTab.module.css';

/**
 * MaintenanceTab Component
 * Gestión de almacenamiento y limpieza de metadata
 */
export function MaintenanceTab() {
  const { t } = useTranslation();
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [populateResult, setPopulateResult] = useState<PopulateResult | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const [populateError, setPopulateError] = useState<string | null>(null);
  const { notification, showSuccess, showError, dismiss } = useNotification();
  const autoHideTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useStorageStats();
  const { data: paths } = useStoragePaths();
  const cleanupMutation = useCleanupOrphaned();
  const cacheMutation = useClearCache();
  const populateMutation = usePopulateSortNames();

  useEffect(() => {
    const timers = autoHideTimersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const handleCleanupClick = () => {
    setShowCleanupConfirm(true);
  };

  const runCleanup = () => {
    setCleanupResult(null);
    dismiss();
    setShowCleanupConfirm(false);

    cleanupMutation.mutate(undefined, {
      onSuccess: (data) => {
        setCleanupResult(data);
        const timer = setTimeout(() => setCleanupResult(null), 5000);
        autoHideTimersRef.current.add(timer);
      },
      onError: (err) => {
        showError(getApiErrorMessage(err, t('admin.maintenance.cleanupError')));
      },
    });
  };

  const handleCacheClick = () => {
    setShowCacheConfirm(true);
  };

  const clearCache = () => {
    setShowCacheConfirm(false);
    dismiss();

    cacheMutation.mutate(undefined, {
      onSuccess: () => {
        showSuccess(t('admin.maintenance.cacheCleared'));
      },
      onError: (err) => {
        showError(getApiErrorMessage(err, t('admin.maintenance.cacheError')));
      },
    });
  };

  const handlePopulateSortNames = () => {
    setPopulateError(null);

    populateMutation.mutate(undefined, {
      onSuccess: (data) => {
        setPopulateResult(data);
        const timer = setTimeout(() => setPopulateResult(null), 5000);
        autoHideTimersRef.current.add(timer);
      },
      onError: (err) => {
        setPopulateError(getApiErrorMessage(err, t('admin.maintenance.generateSortNamesError')));
      },
    });
  };

  const isCleaning = cleanupMutation.isPending;
  const isPopulating = populateMutation.isPending;

  return (
    <div className={styles.container}>
      {/* Storage Stats */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{t('admin.maintenance.storage')}</h3>
          {!isLoadingStats && stats && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStats()}
              leftIcon={<RefreshCw size={14} />}
            >
              {t('admin.maintenance.refresh')}
            </Button>
          )}
        </div>

        {isLoadingStats ? (
          <div className={styles.loading}>{t('admin.maintenance.loadingStats')}</div>
        ) : stats ? (
          <StorageStatsGrid stats={stats} />
        ) : (
          <div className={styles.error}>{t('admin.maintenance.errorLoadingStats')}</div>
        )}
      </div>

      {/* Storage Paths */}
      {paths && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{t('admin.maintenance.storagePaths')}</h3>
          </div>
          <StoragePathsList paths={paths} />
        </div>
      )}

      {/* Cleanup Actions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{t('admin.maintenance.cleanup')}</h3>
          <p className={styles.sectionDescription}>{t('admin.maintenance.cleanupDescription')}</p>
        </div>

        <div className={styles.actionsGrid}>
          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <Trash2 size={20} className={styles.actionIcon} />
              <div className={styles.actionInfo}>
                <h4 className={styles.actionTitle}>{t('admin.maintenance.cleanOrphanFiles')}</h4>
                <p className={styles.actionDescription}>
                  {t('admin.maintenance.cleanOrphanDescription')}
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
              {t('admin.maintenance.runCleanup')}
            </Button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <RefreshCw size={20} className={styles.actionIcon} />
              <div className={styles.actionInfo}>
                <h4 className={styles.actionTitle}>{t('admin.maintenance.clearCache')}</h4>
                <p className={styles.actionDescription}>
                  {t('admin.maintenance.clearCacheDescription')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handleCacheClick}
              leftIcon={<RefreshCw size={18} />}
            >
              {t('admin.maintenance.clearCache')}
            </Button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <CheckCircle size={20} className={styles.actionIcon} />
              <div className={styles.actionInfo}>
                <h4 className={styles.actionTitle}>{t('admin.maintenance.generateSortNames')}</h4>
                <p className={styles.actionDescription}>
                  {t('admin.maintenance.generateSortNamesDescription')}
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
              {t('admin.maintenance.generateNames')}
            </Button>
          </div>
        </div>

        {/* Cleanup Result */}
        {cleanupResult && (
          <div className={styles.resultBox}>
            <CheckCircle size={20} className={styles.resultIcon} />
            <div className={styles.resultContent}>
              <p className={styles.resultTitle}>{t('admin.maintenance.cleanupCompleted')}</p>
              <div className={styles.resultStats}>
                <span>
                  <strong>{cleanupResult.filesRemoved || 0}</strong>{' '}
                  {t('admin.maintenance.filesRemoved')}
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>
                  <strong>{formatBytes(cleanupResult.spaceFree || 0)}</strong>{' '}
                  {t('admin.maintenance.spaceRecovered')}
                </span>
                {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                  <>
                    <span className={styles.resultDivider}>•</span>
                    <span className={styles.resultWarning}>
                      <strong>{cleanupResult.errors.length}</strong> {t('admin.maintenance.errors')}
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
              <p className={styles.resultTitle}>{t('admin.maintenance.namesGenerated')}</p>
              <div className={styles.resultStats}>
                <span>
                  <strong>{populateResult.albumsUpdated}</strong>{' '}
                  {t('admin.maintenance.albumsUpdated')}
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>
                  <strong>{populateResult.artistsUpdated}</strong>{' '}
                  {t('admin.maintenance.artistsUpdated')}
                </span>
                <span className={styles.resultDivider}>•</span>
                <span>{(populateResult.duration / 1000).toFixed(2)}s</span>
              </div>
            </div>
          </div>
        )}

        {/* Populate Error */}
        {populateError && (
          <div className={`${styles.resultBox} ${styles.resultBoxError}`}>
            <AlertCircle size={20} className={styles.resultIconError} />
            <div className={styles.resultContent}>
              <p className={styles.resultTitle}>{t('admin.maintenance.generateNamesError')}</p>
              <p className={styles.resultDescription}>{populateError}</p>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onDismiss={dismiss}
            autoHideMs={3000}
          />
        )}
      </div>

      {/* Missing Files Panel */}
      <MissingFilesPanel />

      {/* Info Box */}
      <CollapsibleInfo title={t('admin.maintenance.aboutCleanup')}>
        <p>{t('admin.maintenance.aboutCleanupText')}</p>
        <p>{t('admin.maintenance.cacheAutoRebuild')}</p>
      </CollapsibleInfo>

      {/* Modals */}
      {showCleanupConfirm && (
        <ConfirmDialog
          title={t('admin.maintenance.confirmCleanupTitle')}
          message={t('admin.maintenance.confirmCleanupMessage')}
          confirmText={t('admin.maintenance.confirmCleanupButton')}
          onConfirm={runCleanup}
          onCancel={() => setShowCleanupConfirm(false)}
          isLoading={isCleaning}
        />
      )}

      {showCacheConfirm && (
        <ConfirmDialog
          title={t('admin.maintenance.confirmCacheTitle')}
          message={t('admin.maintenance.confirmCacheMessage')}
          confirmText={t('admin.maintenance.confirmCacheButton')}
          onConfirm={clearCache}
          onCancel={() => setShowCacheConfirm(false)}
          isLoading={false}
        />
      )}
    </div>
  );
}
