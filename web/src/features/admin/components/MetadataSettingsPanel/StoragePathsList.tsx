import { useTranslation } from 'react-i18next';
import { FolderOpen, Lock } from 'lucide-react';
import styles from './MaintenanceTab.module.css';

export interface StoragePaths {
  dataPath: string;
  musicPath: string;
  metadataPath: string;
  albumCoversPath: string;
  artistImagesPath: string;
  userUploadsPath: string;
  isReadOnlyMusic: boolean;
}

interface StoragePathsListProps {
  paths: StoragePaths;
}

export function StoragePathsList({ paths }: StoragePathsListProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.pathsList}>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>{t('admin.maintenance.pathData')}</span>
          <code className={styles.pathValue}>{paths.dataPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          {paths.isReadOnlyMusic ? <Lock size={18} /> : <FolderOpen size={18} />}
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>
            {t('admin.maintenance.pathMusic')}{' '}
            {paths.isReadOnlyMusic && (
              <span className={styles.pathBadge}>{t('admin.maintenance.pathReadOnly')}</span>
            )}
          </span>
          <code className={styles.pathValue}>{paths.musicPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>{t('admin.maintenance.pathExternalMetadata')}</span>
          <code className={styles.pathValue}>{paths.metadataPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>{t('admin.maintenance.pathAlbumCovers')}</span>
          <code className={styles.pathValue}>{paths.albumCoversPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>{t('admin.maintenance.pathArtistImages')}</span>
          <code className={styles.pathValue}>{paths.artistImagesPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>{t('admin.maintenance.pathUserAvatars')}</span>
          <code className={styles.pathValue}>{paths.userUploadsPath}</code>
        </div>
      </div>
    </div>
  );
}
