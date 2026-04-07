/**
 * Directory Browser Modal Component
 *
 * Modal file browser for selecting storage directories
 */

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h4>{t('admin.metadata.storage.selectFolder')}</h4>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.browser}>
          <div className={styles.browserPath}>
            <span>{t('admin.metadata.storage.currentPath')}</span>
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
              <div className={styles.emptyDirectory}>
                {t('admin.metadata.storage.noSubdirectories')}
              </div>
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
                  {t('admin.metadata.storage.select')}
                </Button>
              </div>
            ))}
          </div>

          {isLoading && (
            <div className={styles.loadingBrowser}>
              {t('admin.metadata.storage.loadingBrowser')}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button onClick={() => onSelect(currentPath)} variant="primary">
            {t('admin.metadata.storage.useCurrentFolder')}
          </Button>
          <Button onClick={onClose} variant="ghost">
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
