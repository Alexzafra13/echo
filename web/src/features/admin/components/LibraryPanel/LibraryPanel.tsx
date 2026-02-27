import { useState, useEffect } from 'react';
import { FolderOpen, Folder, Check, AlertCircle, ChevronRight, ChevronUp, Music, RefreshCw } from 'lucide-react';
import { getLibraryConfig, updateLibraryPath, browseDirectories, LibraryConfig, DirectoryInfo } from '../../api/library.api';
import styles from './LibraryPanel.module.css';

/**
 * LibraryPanel Component
 * Panel para gestionar la ruta de la biblioteca de música
 */
export function LibraryPanel() {
  const [config, setConfig] = useState<LibraryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Browser state
  const [showBrowser, setShowBrowser] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getLibraryConfig();
      setConfig(data);

      // Set initial browse path to current library path or first mounted path
      if (data.path) {
        setCurrentPath(data.path);
      } else if (data.mountedPaths.length > 0) {
        setCurrentPath(data.mountedPaths[0]);
      }
    } catch (err) {
      setError('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async (path: string) => {
    try {
      setBrowsing(true);
      const result = await browseDirectories(path);
      setCurrentPath(result.currentPath);
      setDirectories(result.directories);
      setParentPath(result.parentPath);
    } catch (err) {
      setError('Error navegando directorio');
    } finally {
      setBrowsing(false);
    }
  };

  const handleSelectPath = async (path: string) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await updateLibraryPath(path);

      if (result.success) {
        setSuccess(`Ruta actualizada. ${result.fileCount} archivos de música encontrados.`);
        setShowBrowser(false);
        await loadConfig();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const openBrowser = () => {
    setShowBrowser(true);
    handleBrowse(config?.path || '/');
  };

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Cargando...</div>
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
            <h2 className={styles.title}>Biblioteca de Música</h2>
          </div>
          <p className={styles.description}>
            Configura la carpeta donde está tu colección de música
          </p>
        </div>
      </div>

      {/* Current Path Card */}
      <div className={styles.pathCard}>
        <div className={styles.pathHeader}>
          <FolderOpen size={24} className={styles.pathIcon} />
          <div className={styles.pathInfo}>
            <span className={styles.pathLabel}>Ruta actual</span>
            <span className={styles.pathValue}>{config?.path || 'No configurada'}</span>
          </div>
          {config?.exists && config?.readable && (
            <div className={styles.pathStatus}>
              <Check size={16} />
              <span>{config.fileCount} archivos</span>
            </div>
          )}
          {config?.exists === false && (
            <div className={styles.pathStatusError}>
              <AlertCircle size={16} />
              <span>No existe</span>
            </div>
          )}
        </div>

        <button className={styles.changeButton} onClick={openBrowser}>
          <FolderOpen size={16} />
          Cambiar ruta
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
            <h3 className={styles.browserTitle}>Seleccionar carpeta</h3>
            <button
              className={styles.browserClose}
              onClick={() => setShowBrowser(false)}
            >
              Cancelar
            </button>
          </div>

          {/* Current path */}
          <div className={styles.browserPath}>
            <span className={styles.browserPathLabel}>Ubicación:</span>
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
                Subir
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
                Cargando...
              </div>
            ) : directories.length === 0 ? (
              <div className={styles.browserEmpty}>
                No hay subdirectorios
              </div>
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
                    {dir.hasMusic && (
                      <Music size={14} className={styles.musicIcon} />
                    )}
                    <ChevronRight size={16} className={styles.chevron} />
                  </button>

                  <button
                    className={styles.selectButton}
                    onClick={() => handleSelectPath(dir.path)}
                    disabled={!dir.readable || saving}
                  >
                    {saving ? 'Guardando...' : 'Seleccionar'}
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
              {saving ? 'Guardando...' : `Usar esta carpeta (${currentPath})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
