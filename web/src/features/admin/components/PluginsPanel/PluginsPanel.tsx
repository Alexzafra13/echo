import { Puzzle } from 'lucide-react';
import styles from './PluginsPanel.module.css';

/**
 * PluginsPanel Component
 * Panel placeholder for future plugin functionality
 */
export function PluginsPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Puzzle size={32} />
        </div>
        <h2 className={styles.title}>Plugins</h2>
        <p className={styles.description}>
          No hay plugins disponibles en este momento.
          Esta funcionalidad estará disponible en futuras versiones.
        </p>
      </div>
    </div>
  );
}
