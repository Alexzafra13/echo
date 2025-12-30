import { useState, useEffect } from 'react';
import { Folder, HardDrive, CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft, Lock } from 'lucide-react';
import { Button, Input } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import styles from './StorageTab.module.css';

interface DirectoryEntry {
  name: string;
  path: string;
  writable: boolean;
}

interface ValidationResult {
  valid: boolean;
  writable: boolean;
  exists: boolean;
  readOnly: boolean;
  spaceAvailable: string;
  message: string;
}

/**
 * StorageTab Component
 * Configuración de almacenamiento de metadata
 */
export function StorageTab() {
  const [storageMode, setStorageMode] = useState<'centralized' | 'portable'>('centralized');
  const [storagePath, setStoragePath] = useState('/app/uploads/metadata');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File browser state
  const [currentPath, setCurrentPath] = useState('/app');
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/admin/settings');
      const data = response.data;

      // Convert array of settings to object
      const settingsMap: any = {};
      data.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
      });

      const mode = settingsMap['metadata.storage.location'] || 'centralized';
      const path = settingsMap['metadata.storage.path'] || '/app/uploads/metadata';

      setStorageMode(mode);
      setStoragePath(path);

      // Auto-validate current path
      validatePath(path);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading settings:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validatePath = async (path: string) => {
    if (!path.trim()) {
      setValidationResult(null);
      return;
    }

    try {
      setIsValidating(true);
      const response = await apiClient.post('/admin/settings/validate-storage-path', {
        path: path.trim(),
      });

      setValidationResult(response.data);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error validating path:', error);
      }
      setValidationResult({
        valid: false,
        writable: false,
        exists: false,
        readOnly: false,
        spaceAvailable: 'Unknown',
        message: 'Error al validar la ruta',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const browseDirectory = async (path: string) => {
    try {
      setIsBrowsing(true);
      const response = await apiClient.post('/admin/settings/browse-directories', {
        path: path,
      });

      setCurrentPath(response.data.path);
      setDirectories(response.data.directories);
      setParentPath(response.data.parent);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error browsing directory:', error);
      }
    } finally {
      setIsBrowsing(false);
    }
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = e.target.value;
    setStoragePath(newPath);
  };

  const handlePathBlur = () => {
    validatePath(storagePath);
  };

  const handleSelectDirectory = (dirPath: string) => {
    setStoragePath(dirPath);
    setShowBrowser(false);
    validatePath(dirPath);
  };

  const handleOpenBrowser = () => {
    setShowBrowser(true);
    browseDirectory(currentPath);
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      // Save storage mode
      await apiClient.put(`/admin/settings/metadata.storage.location`, {
        value: storageMode,
      });

      // Save storage path
      await apiClient.put(`/admin/settings/metadata.storage.path`, {
        value: storagePath,
      });

      setSaveMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error saving settings:', error);
      }
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al guardar la configuración'
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Cargando configuración...</div>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Configuración de Almacenamiento</h3>

      {/* Storage Mode */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          <HardDrive size={18} />
          Modo de almacenamiento
        </h4>

        <div className={styles.radioGroup}>
          <label className={`${styles.radioOption} ${storageMode === 'centralized' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="storageMode"
              value="centralized"
              checked={storageMode === 'centralized'}
              onChange={(e) => setStorageMode(e.target.value as 'centralized' | 'portable')}
            />
            <div className={styles.radioContent}>
              <div className={styles.radioLabel}>
                <strong>Centralizado</strong>
                <span className={styles.badge}>Recomendado</span>
              </div>
              <p className={styles.radioDescription}>
                Todas las imágenes se guardan en una carpeta de la aplicación
              </p>
            </div>
          </label>

          <label className={`${styles.radioOption} ${storageMode === 'portable' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="storageMode"
              value="portable"
              checked={storageMode === 'portable'}
              onChange={(e) => setStorageMode(e.target.value as 'centralized' | 'portable')}
            />
            <div className={styles.radioContent}>
              <div className={styles.radioLabel}>
                <strong>Portable</strong>
              </div>
              <p className={styles.radioDescription}>
                Las imágenes se guardan junto a los archivos de música
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Storage Path */}
      {storageMode === 'centralized' && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Folder size={18} />
            Ruta de almacenamiento
          </h4>

          <div className={styles.pathInput}>
            <Input
              type="text"
              value={storagePath}
              onChange={handlePathChange}
              onBlur={handlePathBlur}
              placeholder="/app/uploads/metadata"
            />
            <Button
              onClick={handleOpenBrowser}
              variant="outline"
              size="sm"
            >
              Explorar
            </Button>
          </div>

          {/* Validation Status */}
          {isValidating && (
            <div className={styles.validating}>
              Validando ruta...
            </div>
          )}

          {validationResult && !isValidating && (
            <div className={`${styles.validation} ${validationResult.valid ? styles.valid : styles.invalid}`}>
              {validationResult.valid ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              <div>
                <strong>{validationResult.message}</strong>
                {validationResult.readOnly && (
                  <div className={styles.warning}>
                    <Lock size={14} />
                    Esta ruta es de solo lectura. Las imágenes no se podrán guardar aquí.
                  </div>
                )}
                {!validationResult.exists && validationResult.writable && (
                  <div className={styles.info}>
                    La carpeta se creará automáticamente al guardar.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Browser Modal */}
      {showBrowser && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Seleccionar carpeta</h4>
              <button
                className={styles.closeButton}
                onClick={() => setShowBrowser(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.browser}>
              <div className={styles.browserPath}>
                <span>Ruta actual:</span>
                <code>{currentPath}</code>
              </div>

              {parentPath && (
                <button
                  className={styles.directoryItem}
                  onClick={() => browseDirectory(parentPath)}
                  disabled={isBrowsing}
                >
                  <ChevronLeft size={16} />
                  <Folder size={16} />
                  <span>..</span>
                </button>
              )}

              <div className={styles.directoryList}>
                {directories.length === 0 && !isBrowsing && (
                  <div className={styles.emptyDirectory}>
                    No hay subdirectorios
                  </div>
                )}

                {directories.map((dir) => (
                  <div key={dir.path} className={styles.directoryRow}>
                    <button
                      className={styles.directoryItem}
                      onClick={() => browseDirectory(dir.path)}
                      disabled={isBrowsing}
                    >
                      <ChevronRight size={16} />
                      <Folder size={16} />
                      <span>{dir.name}</span>
                      {!dir.writable && <Lock size={14} className={styles.lockIcon} />}
                    </button>

                    <Button
                      onClick={() => handleSelectDirectory(dir.path)}
                      variant="outline"
                      size="sm"
                      disabled={!dir.writable}
                    >
                      Seleccionar
                    </Button>
                  </div>
                ))}
              </div>

              {isBrowsing && (
                <div className={styles.loadingBrowser}>
                  Cargando...
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                onClick={() => handleSelectDirectory(currentPath)}
                variant="primary"
              >
                Usar carpeta actual
              </Button>
              <Button
                onClick={() => setShowBrowser(false)}
                variant="ghost"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <AlertCircle size={18} />
        <div className={styles.infoContent}>
          <p><strong>Información importante:</strong></p>
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
          onClick={saveSettings}
          disabled={isSaving || (validationResult !== null && !validationResult.valid)}
          loading={isSaving}
          variant="primary"
        >
          Guardar configuración
        </Button>

        {saveMessage && (
          <div className={`${styles.saveMessage} ${styles[saveMessage.type]}`}>
            {saveMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
