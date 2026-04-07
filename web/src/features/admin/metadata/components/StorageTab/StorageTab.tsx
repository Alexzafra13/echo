/**
 * Storage Tab Component (Refactored)
 *
 * Container for storage configuration with clean architecture
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useMetadataSettings } from '../../hooks/queries/useMetadataSettings';
import { useUpdateMetadataSettings } from '../../hooks/mutations/useUpdateMetadataSettings';
import { useValidateStoragePath } from '../../hooks/mutations/useValidateStoragePath';
import { useBrowseDirectories } from '../../hooks/mutations/useBrowseDirectories';
import { StorageModeSelector } from './StorageModeSelector';
import { PathInput } from './PathInput';
import { DirectoryBrowser } from './DirectoryBrowser';
import type { StorageMode, StorageValidationResult, DirectoryBrowseResult } from '../../types';
import styles from './StorageTab.module.css';

/**
 * Storage configuration tab
 */
export function StorageTab() {
  const { t } = useTranslation();
  // React Query hooks
  const { data: settings, isLoading } = useMetadataSettings();
  const updateSettings = useUpdateMetadataSettings();
  const validatePath = useValidateStoragePath();
  const browse = useBrowseDirectories();

  // Local form state
  const [storageMode, setStorageMode] = useState<StorageMode>('centralized');
  const [storagePath, setStoragePath] = useState('/app/uploads/metadata');
  const [validationResult, setValidationResult] = useState<StorageValidationResult | null>(null);

  // Directory browser state
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserData, setBrowserData] = useState<DirectoryBrowseResult | null>(null);

  // Sync settings to local state when loaded
  useEffect(() => {
    if (settings) {
      setStorageMode(settings.storage.mode);
      setStoragePath(settings.storage.path);

      // Auto-validate current path
      validatePath.mutate(settings.storage.path, {
        onSuccess: (result) => setValidationResult(result),
      });
    }
  }, [settings]);

  // Sync browse results to local state
  useEffect(() => {
    if (browse.data) {
      setBrowserData(browse.data);
    }
  }, [browse.data]);

  const handlePathChange = (newPath: string) => {
    setStoragePath(newPath);
  };

  const handlePathBlur = () => {
    validatePath.mutate(storagePath, {
      onSuccess: (result) => setValidationResult(result),
      onError: () => {
        setValidationResult({
          valid: false,
          writable: false,
          exists: false,
          readOnly: false,
          spaceAvailable: 'Unknown',
          message: t('admin.metadata.storage.validatePathError'),
        });
      },
    });
  };

  const handleOpenBrowser = () => {
    setShowBrowser(true);
    browse.mutate(storagePath || '/app');
  };

  const handleBrowserNavigate = (path: string) => {
    browse.mutate(path);
  };

  const handleBrowserSelect = (path: string) => {
    setStoragePath(path);
    setShowBrowser(false);
    validatePath.mutate(path, {
      onSuccess: (result) => setValidationResult(result),
    });
  };

  const handleSave = () => {
    updateSettings.mutate({
      storage: {
        mode: storageMode,
        path: storagePath,
      },
    });
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('admin.metadata.storage.loadingConfig')}</div>;
  }

  const isSaveDisabled =
    updateSettings.isPending || (validationResult !== null && !validationResult.valid);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t('admin.metadata.storage.title')}</h3>

      {/* Storage Mode Selector */}
      <StorageModeSelector
        mode={storageMode}
        onChange={setStorageMode}
        disabled={updateSettings.isPending}
      />

      {/* Path Input (only for centralized mode) */}
      {storageMode === 'centralized' && (
        <PathInput
          path={storagePath}
          onChange={handlePathChange}
          onBlur={handlePathBlur}
          onBrowse={handleOpenBrowser}
          validationResult={validationResult}
          isValidating={validatePath.isPending}
          disabled={updateSettings.isPending}
        />
      )}

      {/* Directory Browser Modal */}
      <DirectoryBrowser
        isOpen={showBrowser}
        currentPath={browserData?.currentPath || storagePath}
        parentPath={browserData?.parentPath || null}
        directories={browserData?.directories || []}
        isLoading={browse.isPending}
        onNavigate={handleBrowserNavigate}
        onSelect={handleBrowserSelect}
        onClose={() => setShowBrowser(false)}
      />

      {/* Info Box */}
      <div className={styles.infoBox}>
        <AlertCircle size={18} />
        <div className={styles.infoContent}>
          <p>
            <strong>{t('admin.metadata.storage.importantInfo')}</strong>
          </p>
          <ul>
            <li>
              <strong>{t('admin.metadata.storage.musicLibraryInfo')}</strong>{' '}
              {t('admin.metadata.storage.musicLibraryMount')} <code>/music</code>
            </li>
            <li>
              <strong>{t('admin.metadata.storage.downloadedMetadata')}</strong>{' '}
              {t('admin.metadata.storage.downloadedMetadataInfo')}
            </li>
            <li>{t('admin.metadata.storage.centralizedRecommendation')}</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.actions}>
        <Button
          onClick={handleSave}
          disabled={isSaveDisabled}
          loading={updateSettings.isPending}
          variant="primary"
        >
          {t('admin.metadata.storage.saveConfig')}
        </Button>

        {updateSettings.isSuccess && (
          <div className={`${styles.saveMessage} ${styles.success}`}>
            <CheckCircle2 size={16} />
            {t('admin.metadata.storage.configSaved')}
          </div>
        )}

        {updateSettings.isError && (
          <div className={`${styles.saveMessage} ${styles.error}`}>
            <XCircle size={16} />
            {t('admin.metadata.storage.saveError')}
          </div>
        )}
      </div>
    </div>
  );
}
