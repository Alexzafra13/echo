/**
 * Auto-Search Toggle Component
 *
 * Checkbox to enable/disable auto-search during scans
 */

import styles from './AutoSearchTab.module.css';

export interface AutoSearchToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle for enabling/disabling auto-search
 */
export function AutoSearchToggle({ enabled, onChange, disabled }: AutoSearchToggleProps) {
  return (
    <div className={styles.section}>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label className={styles.settingLabel}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              className={styles.checkbox}
              disabled={disabled}
            />
            <span>Habilitar auto-búsqueda durante el scan</span>
          </label>
          <p className={styles.settingDescription}>
            Cuando está habilitado, el scanner buscará automáticamente MusicBrainz IDs para artistas,
            álbumes y tracks que no los tengan en sus etiquetas ID3.
          </p>
        </div>
      </div>
    </div>
  );
}
