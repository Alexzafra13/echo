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
  return (
    <div className={styles.pathsList}>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>Datos</span>
          <code className={styles.pathValue}>{paths.dataPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          {paths.isReadOnlyMusic ? <Lock size={18} /> : <FolderOpen size={18} />}
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>
            Música {paths.isReadOnlyMusic && <span className={styles.pathBadge}>Solo lectura</span>}
          </span>
          <code className={styles.pathValue}>{paths.musicPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>Metadatos externos</span>
          <code className={styles.pathValue}>{paths.metadataPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>Carátulas de álbumes</span>
          <code className={styles.pathValue}>{paths.albumCoversPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>Imágenes de artistas</span>
          <code className={styles.pathValue}>{paths.artistImagesPath}</code>
        </div>
      </div>
      <div className={styles.pathItem}>
        <div className={styles.pathIcon}>
          <FolderOpen size={18} />
        </div>
        <div className={styles.pathInfo}>
          <span className={styles.pathLabel}>Avatares de usuarios</span>
          <code className={styles.pathValue}>{paths.userUploadsPath}</code>
        </div>
      </div>
    </div>
  );
}
