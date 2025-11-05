import { Clock, Info } from 'lucide-react';
import styles from './HistoryTab.module.css';

/**
 * HistoryTab Component
 * Historial de enriquecimientos de metadata
 *
 * TODO: Implement backend endpoint for enrichment history
 */
export function HistoryTab() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Historial de Enriquecimientos</h3>
          <p className={styles.description}>
            Registro de todos los enriquecimientos de metadata realizados
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className={styles.empty}>
        <Clock size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>
          El historial de enriquecimientos estará disponible próximamente
        </p>
        <div className={styles.infoBox}>
          <Info size={16} className={styles.infoIcon} />
          <p className={styles.infoText}>
            Mientras tanto, puedes ver las notificaciones de metadatos enriquecidos en el icono de
            campana del header (solo admin).
          </p>
        </div>
      </div>
    </div>
  );
}
