/**
 * Storage Tab Component (Refactored)
 *
 * Container for storage configuration with clean architecture
 */

import { useState, useEffect } from 'react';
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
          message: 'Error al validar la ruta',
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
    return <div className={styles.loading}>Cargando configuración...</div>;
  }

  const isSaveDisabled =
    updateSettings.isPending || (validationResult !== null && !validationResult.valid);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Configuración de Almacenamiento</h3>

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
            <strong>Información importante:</strong>
          </p>
          <ul>
            <li>
              <strong>Biblioteca de música:</strong> Montada como solo lectura en <code>/music</code>
            </li>
            <li>
              <strong>Metadata descargada:</strong> Se guarda en la ruta configurada arriba
            </li>
            <li>
              El modo centralizado es recomendado para evitar problemas con volúmenes read-only
            </li>
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
          Guardar configuración
        </Button>

        {updateSettings.isSuccess && (
          <div className={`${styles.saveMessage} ${styles.success}`}>
            <CheckCircle2 size={16} />
            Configuración guardada
          </div>
        )}

        {updateSettings.isError && (
          <div className={`${styles.saveMessage} ${styles.error}`}>
            <XCircle size={16} />
            Error al guardar
          </div>
        )}
      </div>
    </div>
  );
}
