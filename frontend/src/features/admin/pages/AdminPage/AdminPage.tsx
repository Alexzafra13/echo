import { ScannerPanel } from '../../components/ScannerPanel/ScannerPanel';
import { MetadataSettingsPanel } from '../../components/MetadataSettingsPanel';
import { MetadataConflictsPanel } from '../../components/MetadataConflictsPanel';
import styles from './AdminPage.module.css';

/**
 * AdminPage Component
 * Panel de administración para gestionar la librería musical
 * Solo accesible para usuarios con rol admin
 */
export default function AdminPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Administración</h1>
        <p className={styles.subtitle}>
          Gestiona tu librería musical y configuración del servidor
        </p>
      </div>

      <div className={styles.content}>
        <ScannerPanel />
        <MetadataConflictsPanel />
        <MetadataSettingsPanel />
      </div>
    </div>
  );
}
