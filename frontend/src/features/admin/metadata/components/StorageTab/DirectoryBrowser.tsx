/**
 * Directory Browser Modal Component
 *
 * Modal file browser for selecting storage directories
 */

import { Folder, ChevronRight, ChevronLeft, Lock } from 'lucide-react';
import { Button } from '@shared/components/ui';
import type { DirectoryItem } from '../../types';
import styles from './StorageTab.module.css';

export interface DirectoryBrowserProps {
  isOpen: boolean;
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
  isLoading: boolean;
  onNavigate: (path: string) => void;
  onSelect: (path: string) => void;
  onClose: () => void;
}

/**
 * Directory browser modal with navigation
 */
export function DirectoryBrowser({
  isOpen,
  currentPath,
  parentPath,
  directories,
  isLoading,
  onNavigate,
  onSelect,
  onClose,
}: DirectoryBrowserProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h4>Seleccionar carpeta</h4>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.browser}>
          <div className={styles.browserPath}>
            <span>Ruta actual:</span>
            <code>{currentPath}</code>
          </div>

          {/* Parent directory navigation */}
          {parentPath && (
            <button
              className={styles.directoryItem}
              onClick={() => onNavigate(parentPath)}
              disabled={isLoading}
            >
              <ChevronLeft size={16} />
              <Folder size={16} />
              <span>..</span>
            </button>
          )}

          {/* Directory list */}
          <div className={styles.directoryList}>
            {directories.length === 0 && !isLoading && (
              <div className={styles.emptyDirectory}>No hay subdirectorios</div>
            )}

            {directories.map((dir) => (
              <div key={dir.path} className={styles.directoryRow}>
                <button
                  className={styles.directoryItem}
                  onClick={() => onNavigate(dir.path)}
                  disabled={isLoading}
                >
                  <ChevronRight size={16} />
                  <Folder size={16} />
                  <span>{dir.name}</span>
                  {!dir.writable && <Lock size={14} className={styles.lockIcon} />}
                </button>

                <Button
                  onClick={() => onSelect(dir.path)}
                  variant="outline"
                  size="sm"
                  disabled={!dir.writable}
                >
                  Seleccionar
                </Button>
              </div>
            ))}
          </div>

          {isLoading && <div className={styles.loadingBrowser}>Cargando...</div>}
        </div>

        <div className={styles.modalFooter}>
          <Button onClick={() => onSelect(currentPath)} variant="primary">
            Usar carpeta actual
          </Button>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
